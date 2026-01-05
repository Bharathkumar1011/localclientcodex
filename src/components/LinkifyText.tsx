import React from "react";

function splitByUrls(text: string) {
  // matches http:// or https:// up to whitespace or common closing punctuation
  const urlRegex = /(https?:\/\/[^\s<>"')\]]+)/gi;

  const parts: Array<{ type: "text" | "url"; value: string }> = [];
  let lastIndex = 0;

  for (const match of text.matchAll(urlRegex)) {
    const url = match[0];
    const index = match.index ?? 0;

    if (index > lastIndex) {
      parts.push({ type: "text", value: text.slice(lastIndex, index) });
    }
    parts.push({ type: "url", value: url });
    lastIndex = index + url.length;
  }

  if (lastIndex < text.length) {
    parts.push({ type: "text", value: text.slice(lastIndex) });
  }

  return parts;
}

export function LinkifyText({
  text,
  className,
  linkClassName,
}: {
  text?: string | null;
  className?: string;
  linkClassName?: string;
}) {
  const t = (text ?? "").toString();

  if (!t.trim()) {
    return <span className="text-muted-foreground">Not provided</span>;
  }

  const parts = splitByUrls(t);

  return (
    <p className={className ?? "whitespace-pre-wrap"}>
      {parts.map((p, i) => {
        if (p.type === "url") {
          return (
            <a
              key={i}
              href={p.value}
              target="_blank"
              rel="noopener noreferrer"
              className={linkClassName ?? "text-primary underline underline-offset-2"}
            >
              {p.value}
            </a>
          );
        }
        return <React.Fragment key={i}>{p.value}</React.Fragment>;
      })}
    </p>
  );
}
