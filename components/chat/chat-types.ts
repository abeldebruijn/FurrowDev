export type ChatRole = "assistant" | "user";

export type ChatRenderMessage<TMeta = undefined> = {
  content: string;
  id: string;
  isTransient: boolean;
  meta?: TMeta;
  role: ChatRole;
};
