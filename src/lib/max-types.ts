export type MaxChat = { id: string; title: string; at: string };

export type MaxButton =
  | { type: "link"; text: string; url: string }
  | { type: "callback"; text: string; payload: string };

export type MaxSendOpts = {
  format?: "markdown" | "html";
  button?: { text: string; url: string };
  buttons?: MaxButton[][];
};

export type MaxSetup = {
  sms: boolean;
  max: boolean;
  hasToken: boolean;
  tokenHint: string;
  chatId: string;
  botName: string;
  botUsername: string;
  chats: MaxChat[];
  webhookUrl: string | null;
};
