type TextPartMessage = {
  parts: Array<{
    text?: string;
    type: string;
  }>;
};

export function getTextFromUIMessage(message: TextPartMessage) {
  return message.parts
    .flatMap((part) => (part.type === "text" ? [part.text ?? ""] : []))
    .join("")
    .trim();
}
