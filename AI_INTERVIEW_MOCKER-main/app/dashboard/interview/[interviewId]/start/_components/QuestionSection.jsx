import { Lightbulb, Volume2, VolumeX } from "lucide-react";
import React, { useState, useRef } from "react";

const QuestionSection = ({ mockInterviewQuestion, activeQuestionIndex }) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const utteranceRef = useRef(null);

  const textToSpeech = (text) => {
    if (!("speechSynthesis" in window)) {
      alert("Sorry, your browser does not support text to speech.");
      return;
    }

    // If already speaking, stop it
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onend = () => setIsSpeaking(false); // reset when done
    utterance.onerror = () => setIsSpeaking(false);

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  return (
    mockInterviewQuestion && (
      <div className="flex flex-col justify-between p-5 border rounded-lg my-1 bg-secondary">
        {/* Question number grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {mockInterviewQuestion.map((question, index) => (
            <h2
              key={index}
              className={`p-2 rounded-full text-center text-xs md:text-sm cursor-pointer md:block hidden ${
                activeQuestionIndex === index
                  ? "bg-black text-white"
                  : "bg-secondary"
              }`}
            >
              Question #{index + 1}
            </h2>
          ))}
        </div>

        {/* Question text */}
        <div className="flex items-center justify-between my-5">
          <h2 className="text-md md:text-lg flex-1">
            {mockInterviewQuestion[activeQuestionIndex]?.Question}
          </h2>
          {/* Speaker icon */}
          {isSpeaking ? (
            <VolumeX
              className="cursor-pointer text-red-500 animate-pulse"
              onClick={() =>
                textToSpeech(mockInterviewQuestion[activeQuestionIndex]?.Question)
              }
              title="Stop speaking"
            />
          ) : (
            <Volume2
              className="cursor-pointer text-blue-500"
              onClick={() =>
                textToSpeech(mockInterviewQuestion[activeQuestionIndex]?.Question)
              }
              title="Speak question"
            />
          )}
        </div>

        {/* Note section */}
        <div className="border rounded-lg p-5 bg-blue-100 mt-18 md:block hidden">
          <h2 className="flex gap-2 items-center text-blue-800">
            <Lightbulb />
            <strong>Note:</strong>
          </h2>
          <h2 className="text-sm text-blue-600 my-2">
            {process.env.NEXT_PUBLIC_QUESTION_NOTE}
          </h2>
        </div>
      </div>
    )
  );
};

export default QuestionSection;
