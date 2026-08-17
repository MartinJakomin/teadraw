import React, { useEffect, useState } from "react";
import { Socket } from "socket.io-client";

type FloatingEmote = {
  id: string;
  emoji: string;
  senderName?: string;
  left: number;
  rotation: number;
};

export function FloatingReactions(props: { socket: Socket; roomCode?: string; playerId?: string }) {
  const [emotes, setEmotes] = useState<FloatingEmote[]>([]);
  const reactions = ["😂", "🔥", "😱", "👏", "🎨", "💯", "💀", "🤯", "💩", "🥳", "❤️", "👀", "🤡", "🚀", "🤔", "👑"];

  useEffect(() => {
    const onReaction = ({ id, emoji, senderName }: { id: string; emoji: string; senderId?: string; senderName?: string }) => {
      const newEmote: FloatingEmote = {
        id: id || Math.random().toString(36).substr(2, 9),
        emoji,
        senderName: senderName || undefined,
        left: Math.random() * 75 + 12,
        rotation: (Math.random() - 0.5) * 30
      };
      setEmotes((prev) => [...prev.slice(-25), newEmote]);

      setTimeout(() => {
        setEmotes((prev) => prev.filter((e) => e.id !== newEmote.id));
      }, 3000);
    };

    props.socket.on("reaction:emit", onReaction);
    return () => {
      props.socket.off("reaction:emit", onReaction);
    };
  }, [props.socket]);

  const sendReaction = (emoji: string) => {
    if (!props.roomCode) return;
    props.socket.emit("room:reaction", { roomCode: props.roomCode, emoji, playerId: props.playerId });
  };

  return (
    <>
      {/* Floating Emojis Canvas Overlay */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          zIndex: 9999,
          overflow: "hidden"
        }}
      >
        {emotes.map((e) => (
          <div
            key={e.id}
            style={{
              position: "absolute",
              bottom: "40px",
              left: `${e.left}%`,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              transform: `rotate(${e.rotation}deg)`,
              animation: "floatUpReaction 2.8s cubic-bezier(0.16, 1, 0.3, 1) forwards",
              filter: "drop-shadow(0 4px 12px rgba(0, 0, 0, 0.3))",
              pointerEvents: "none"
            }}
          >
            <span style={{ fontSize: "2.4rem", lineHeight: 1 }}>{e.emoji}</span>
            {e.senderName && (
              <span
                style={{
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  background: "rgba(15, 23, 42, 0.85)",
                  color: "#fff",
                  padding: "2px 8px",
                  borderRadius: "999px",
                  marginTop: "4px",
                  whiteSpace: "nowrap",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  letterSpacing: "0.02em"
                }}
              >
                {e.senderName}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Floating Quick Emote Bar at bottom left */}
      {props.roomCode && (
        <div
          style={{
            position: "fixed",
            bottom: "14px",
            left: "14px",
            maxWidth: "calc(100vw - 28px)",
            zIndex: 9000,
            display: "flex",
            alignItems: "center",
            gap: "3px",
            padding: "4px 8px",
            borderRadius: "99px",
            background: "rgba(15, 23, 42, 0.82)",
            backdropFilter: "blur(14px)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            boxShadow: "0 4px 16px rgba(0, 0, 0, 0.3)",
            overflowX: "auto",
            scrollbarWidth: "none"
          }}
        >
          {reactions.map((emoji) => (
            <button
              key={emoji}
              onClick={() => sendReaction(emoji)}
              style={{
                background: "none",
                border: "none",
                fontSize: "1.1rem",
                lineHeight: 1,
                cursor: "pointer",
                padding: "3px 4px",
                borderRadius: "50%",
                transition: "transform 0.18s cubic-bezier(0.34, 1.56, 0.64, 1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
              className="reaction-btn"
              title={`Send ${emoji} reaction`}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </>
  );
}
