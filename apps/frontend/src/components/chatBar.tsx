"use client";
import { useState } from "react";

export default function ChatInput() {
  const [input, setInput] = useState("");

  const handleSubmit = () => {
    console.log("we submitted something bitch", input);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };
  return (
    <form onSubmit={(e) => e.preventDefault()}>
      <textarea
        className="bg-amber-700 max-h-[200px] min-h-[40px] resize-none bottom-5 w-full p-2 rounded"
        value={input}
        rows={3}
        onChange={(e) => {
          setInput(e.target.value);
          e.target.style.height = "auto";
          e.target.style.height = e.target.scrollHeight + "px";
        }}
        onKeyDown={handleKeyDown}
        placeholder="prompt"
      />
    </form>
  );
}
