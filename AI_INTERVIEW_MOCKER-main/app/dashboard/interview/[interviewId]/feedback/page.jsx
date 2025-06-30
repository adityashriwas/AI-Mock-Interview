"use client";
import { db } from "@/utils/db";
import { UserAnswer } from "@/utils/schema";
import { eq } from "drizzle-orm";
import React, { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Volume2, PauseCircle } from "lucide-react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useMemo } from "react";

let currentUtterance = null; // Track current speech
let isSpeaking = false; // Track if speech is running

const textToSpeech = (text, language = "hi-IN") => {
  if (isSpeaking && currentUtterance) {
    window.speechSynthesis.cancel();
    isSpeaking = false;
    currentUtterance = null;
    return; // Stop here
  }

  window.speechSynthesis.cancel();

  // Create new speech instance
  const utterance = new SpeechSynthesisUtterance(text);
  
  const voices = window.speechSynthesis.getVoices();
  const selectedVoice = voices.find((v) => v.lang.includes(language));

  if (selectedVoice) {
    utterance.voice = selectedVoice;
  } else {
    const defaultVoice = voices.find((v) => v.lang.includes("en-US"));
    utterance.voice = defaultVoice || voices[0]; // Fallback to default voice if selected language not available
    console.warn(`${language} voice not found. Using default voice.`);
  }

  utterance.rate = 1;
  utterance.pitch = 1;

  currentUtterance = utterance;
  isSpeaking = true;

  window.speechSynthesis.speak(utterance);

  utterance.onend = () => {
    isSpeaking = false;
    currentUtterance = null;
  };
};

const Feedback = ({ params }) => {
  const router = useRouter();
  const [feedbackList, setFeedbackList] = useState([]);
  const [isSpeakingState, setIsSpeakingState] = useState(false); // Manage the play/pause state

  useEffect(() => {
    GetFeedback();
  }, []);

  const GetFeedback = async () => {
    const result = await db
      .select()
      .from(UserAnswer)
      .where(eq(UserAnswer.mockIdRef, params.interviewId))
      .orderBy(UserAnswer.id);

    setFeedbackList(result);
  };

  const overallRating = useMemo(() => {
    const validRatings = feedbackList
      .map((item) => Number(item.rating))
      .filter((rating) => !isNaN(rating));

    if (validRatings.length > 0) {
      const total = validRatings.reduce((sum, r) => sum + r, 0);
      return (total / validRatings.length).toFixed(1);
    }

    return 0;
  }, [feedbackList]);

  // Toggle the speech
  const handleSpeechToggle = (text, language = "hi-IN") => {
    if (isSpeakingState) {
      window.speechSynthesis.cancel();
      setIsSpeakingState(false);
    } else {
      textToSpeech(text, language);
      setIsSpeakingState(true);
    }
  };

  return (
    <div className="p-10">
      {feedbackList?.length == 0 ? (
        <h2 className="font-bold text-xl text-gray-500 my-5">
          No Interview feedback Record Found
        </h2>
      ) : (
        <>
          <h2 className="text-3xl font-bold text-green-500">Congratulations</h2>
          <h2 className="font-bold text-2xl">Here is your interview feedback</h2>
          <h2 className="text-primary text-lg my-3">
            Your overall interview rating{" "}
            <strong
              className={`${
                overallRating >= 5 ? "text-green-500" : "text-red-600"
              }`}
            >
              {overallRating}
              <span className="text-black">/10</span>
            </strong>
          </h2>
          <h2 className="text-sm text-gray-500">
            Find below interview question with correct answer, Your answer and
            feedback for improvement
          </h2>
          {feedbackList &&
            feedbackList.map((item, index) => (
              <Collapsible key={index} className="mt-7">
                <CollapsibleTrigger className="p-2 bg-secondary rounded-lg my-2 text-left flex justify-between gap-7 w-full">
                  {item.question} <ChevronDown className="h-5 w-5" />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="flex flex-col gap-2">
                    <h2 className="text-red-500 p-2 border rounded-lg">
                      <strong>Rating: </strong>
                      {item.rating}
                    </h2>
                    <h2 className="p-2 border rounded-lg bg-red-50 text-sm text-red-900">
                      <strong>Your Answer: </strong>
                      {item.userAns}
                      <Volume2
                        className="cursor-pointer"
                        onClick={() => handleSpeechToggle(item.userAns, "hi-IN")}
                      />
                    </h2>
                    <h2 className="p-2 border rounded-lg bg-green-50 text-sm text-green-900">
                      <strong>Correct Answer: </strong>
                      {item.correctAns}
                      <Volume2
                        className="cursor-pointer"
                        onClick={() => handleSpeechToggle(item.correctAns, "hi-IN")}
                      />
                    </h2>
                    <h2 className="p-2 border rounded-lg bg-blue-50 text-sm text-primary-900">
                      <strong>Feedback: </strong>
                      {item.feedback}
                      <Volume2
                        className="cursor-pointer"
                        onClick={() => handleSpeechToggle(item.feedback, "hi-IN")}
                      />
                    </h2>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))}
        </>
      )}

      <Button onClick={() => router.replace("/dashboard")}>Go Home</Button>
    </div>
  );
};

export default Feedback;
