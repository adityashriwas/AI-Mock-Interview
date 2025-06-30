"use client";

import { Button } from "@/components/ui/button";
import Image from "next/image";
import React, { useContext, useEffect, useState, useRef } from "react";
import Webcam from "react-webcam";
import { Mic } from "lucide-react";
import { toast } from "sonner";
import { chatSession } from "@/utils/GeminiAIModal";
import { db } from "@/utils/db";
import { UserAnswer } from "@/utils/schema";
import { useUser } from "@clerk/nextjs";
import moment from "moment";
import { WebCamContext } from "@/app/dashboard/layout";
import { GoogleGenerativeAI } from "@google/generative-ai";

const RecordAnswerSection = ({
  mockInterviewQuestion,
  activeQuestionIndex,
  interviewData,
}) => {
  const [userAnswer, setUserAnswer] = useState("");
  const { user } = useUser();
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const { webCamEnabled, setWebCamEnabled } = useContext(WebCamContext);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY);

  useEffect(() => {
    if (!isRecording && userAnswer.length > 10) {
      updateUserAnswer();
    }
  }, [userAnswer]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      let options = { mimeType: "audio/webm" };
      if (!MediaRecorder.isTypeSupported("audio/webm")) {
        if (MediaRecorder.isTypeSupported("audio/mp4")) {
          options = { mimeType: "audio/mp4" };
        } else if (MediaRecorder.isTypeSupported("audio/wav")) {
          options = { mimeType: "audio/wav" };
        } else {
          toast("Your browser does not support required audio formats.");
          return;
        }
      }

      mediaRecorderRef.current = new MediaRecorder(stream, options);
      chunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, {
          type: mediaRecorderRef.current.mimeType,
        });
        await transcribeAudio(audioBlob);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Error starting recording:", error);
      toast("Microphone permission denied or unavailable.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const transcribeAudio = async (audioBlob) => {
    try {
      setLoading(true);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const base64Audio = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64 = reader.result.split(",")[1];
          resolve(base64);
        };
        reader.onerror = reject;
      });

      const result = await model.generateContent([
        "Transcribe the following audio:",
        { inlineData: { data: base64Audio, mimeType: audioBlob.type } },
      ]);

      const transcription = result.response.text();
      console.log("Transcription:", transcription);

      setUserAnswer((prev) => prev + " " + transcription);
      setLoading(false);
    } catch (error) {
      console.error("Error in transcription:", error);
      toast("Error during audio transcription. Try again.");
      setLoading(false);
    }
  };

  const updateUserAnswer = async () => {
    try {
      setLoading(true);
      const feedbackPrompt =
        "Question:" +
        mockInterviewQuestion[activeQuestionIndex]?.Question +
        ", User Answer:" +
        userAnswer +
        " , Depends on question and user answer for given interview question" +
        " please give us rating for answer and feedback as area of improvement if any " +
        "in just 3 to 5 lines to improve it in JSON format with rating field and feedback field";

      const result = await chatSession.sendMessage(feedbackPrompt);

      let MockJsonResp = result.response.text();
      MockJsonResp = MockJsonResp.replace("```json", "").replace("```", "");

      let jsonFeedbackResp;
      try {
        jsonFeedbackResp = JSON.parse(MockJsonResp);
      } catch (e) {
        throw new Error("Invalid JSON response from Gemini: " + MockJsonResp);
      }

      const resp = await db.insert(UserAnswer).values({
        mockIdRef: interviewData?.mockId,
        question: mockInterviewQuestion[activeQuestionIndex]?.Question,
        correctAns: mockInterviewQuestion[activeQuestionIndex]?.Answer,
        userAns: userAnswer,
        feedback: jsonFeedbackResp?.feedback,
        rating: jsonFeedbackResp?.rating,
        userEmail: user?.primaryEmailAddress?.emailAddress,
        createdAt: moment().format("YYYY-MM-DD"),
      });

      if (resp) {
        toast("User Answer recorded successfully");
      }
      setUserAnswer("");
      setLoading(false);
    } catch (error) {
      console.error("Error saving answer:", error);
      toast("An error occurred while saving the answer.");
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center overflow-hidden">
      <div className="flex flex-col justify-center items-center rounded-lg p-5 bg-black mt-4 w-[30rem]">
        {webCamEnabled ? (
          <Webcam
            mirrored={true}
            style={{ height: 250, width: "100%", zIndex: 10 }}
          />
        ) : (
          <Image src={"/camera.jpg"} width={200} height={200} alt="Camera placeholder" />
        )}
      </div>
      <div className="md:flex mt-4 md:mt-8 md:gap-5">
        <div className="my-4 md:my-0">
          <Button onClick={() => setWebCamEnabled((prev) => !prev)}>
            {webCamEnabled ? "Close WebCam" : "Enable WebCam"}
          </Button>
        </div>
        <Button
          variant="outline"
          onClick={isRecording ? stopRecording : startRecording}
          disabled={loading}
        >
          {isRecording ? (
            <h2 className="text-red-400 flex gap-2">
              <Mic /> Stop Recording...
            </h2>
          ) : (
            "Record Answer"
          )}
        </Button>
      </div>
      {loading && (
        <p className="mt-4 text-sm text-gray-500">Transcribing your audio...</p>
      )}
    </div>
  );
};

export default RecordAnswerSection;
