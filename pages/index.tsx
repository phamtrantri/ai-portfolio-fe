import { Typewriter } from "react-simple-typewriter";
import { useEffect, useState, useRef } from "react";
import { Button } from "@heroui/button";

import { title } from "@/components/primitives";
import DefaultLayout from "@/layouts/default";
import { generateUUID } from "@/utils/uuid";

interface ChatMessage {
  content: string;
  author: "user" | "assistant";
}
type ChatBox = ChatMessage[];

export default function IndexPage() {
  const [divHeight, setDivHeight] = useState("calc(100vh - 200px)");
  const textSectionRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chatboxRef = useRef<HTMLDivElement>(null);
  const [searchStr, setSearchStr] = useState("");
  const [chatbox, setChatbox] = useState<ChatBox>([]);
  const [isConfirming, setIsConfirming] = useState(false);
  const [streamedText, setStreamedText] = useState("");
  const uuidRef = useRef(generateUUID());

  useEffect(() => {
    const calculateHeight = () => {
      const navbar = document.querySelector("nav");
      const textSection = textSectionRef.current;

      if (navbar && textSection) {
        const navbarHeight = navbar.offsetHeight;
        const textSectionHeight = textSection.offsetHeight;
        const margin = 16; // mt-4 margin
        const padding = 32; // p-2 padding

        const remainingHeight =
          window.innerHeight -
          navbarHeight -
          textSectionHeight -
          margin -
          padding;

        setDivHeight(`${remainingHeight}px`);
      }
    };

    calculateHeight();
    window.addEventListener("resize", calculateHeight);

    return () => window.removeEventListener("resize", calculateHeight);
  }, []);

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;

    if (textarea) {
      textarea.style.height = textarea.scrollHeight + "px";
    }
  };
  const resetTextareaHeight = () => {
    const textarea = textareaRef.current;

    if (textarea) {
      textarea.style.height = "48px";
    }
  };

  const scrollToBottom = (extraHeight = 0) => {
    chatboxRef.current?.scrollTo({
      top: chatboxRef.current.scrollHeight + extraHeight,
      behavior: "smooth",
    });
  };

  const handleSubmit = async () => {
    if (!searchStr) {
      return;
    }
    setIsConfirming(true);
    setSearchStr("");
    resetTextareaHeight();

    const _chatbox: ChatBox = [
      ...chatbox,
      { content: searchStr, author: "user" },
    ];

    setChatbox(_chatbox);
    scrollToBottom(200);
    let reader;
    let fullContent = "";

    try {
      const response = await fetch("https://api.phamtrantri.com/ask", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: searchStr, chatId: uuidRef.current }),
      });

      if (!response.body) {
        throw new Error("ReadableStream not supported in this environment.");
      }

      reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;

      while (!done) {
        const { value, done: streamDone } = await reader.read();

        if (value) {
          const chunk = decoder.decode(value, { stream: true });

          fullContent += chunk;
          setStreamedText(fullContent);
        }
        done = streamDone;
        scrollToBottom();
      }
    } finally {
      reader && reader.releaseLock();
      setIsConfirming(false);
      setChatbox((prev) => [
        ...prev,
        { content: fullContent, author: "assistant" },
      ]);
      setStreamedText("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <DefaultLayout>
      <section
        ref={textSectionRef}
        className="flex flex-col items-center justify-center"
      >
        <div className="inline-block text-center justify-center">
          <span className={title()}>&quot;Curious about Tri Pham?&nbsp;</span>
          <br />
          <span
            className={title({
              color: "violet",
              size: "md",
              fontStyle: "italic",
            })}
          >
            <Typewriter
              cursor
              deleteSpeed={50}
              loop={false}
              typeSpeed={50}
              words={[
                "Experience...",
                "Education...",
                "Projects...",
                "Hobbies...",
                "Anything...",
              ]}
            />
          </span>
          <br />
          <span className={title()}>
            Type away — I’ve got answers (and maybe a few fun surprises)!&quot;
          </span>
        </div>
      </section>
      <section className="flex flex-col items-center justify-center mt-4 flex-1 relative">
        <div
          ref={chatboxRef}
          className="w-full sm:w-2/3 flex flex-col border-1 border-default-400 rounded-lg p-2 pb-36 overflow-y-scroll"
          style={{ height: divHeight }}
        >
          {chatbox.map((message, index) => {
            if (message.author === "user") {
              return (
                <div
                  key={index}
                  className="self-end bg-default-200 p-2 rounded-2xl mt-2 mb-2"
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
                </div>
              );
            }

            return (
              <p key={index} className="mt-2 whitespace-pre-wrap">
                {message.content}
              </p>
            );
          })}
          {isConfirming ? (
            <p className="mt-2 whitespace-pre-wrap">
              {streamedText}
              <span className="animate-pulse">|</span>
            </p>
          ) : null}
        </div>
        <div
          className="flex gap-2 absolute bottom-5 left-1/2 transform -translate-x-1/2 
          w-3/4 sm:w-1/2 border-1 border-default-300 rounded-2xl p-3
          bg-default-50"
        >
          <textarea
            ref={textareaRef}
            className="w-full focus:outline-none resize-none min-h-[40px] max-h-[200px] overflow-y-auto"
            placeholder={`Ask me anything
Shift + Enter to submit`}
            value={searchStr}
            onChange={(e) => setSearchStr(e.target.value)}
            onInput={adjustTextareaHeight}
            onKeyDown={handleKeyDown}
          />
          <Button
            className="sm:hidden md:hidden lg:hidden"
            onPress={handleSubmit}
          >
            Submit
          </Button>
        </div>
      </section>
    </DefaultLayout>
  );
}
