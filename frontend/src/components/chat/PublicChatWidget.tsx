"use client";

import { ChatWidget } from "./ChatWidget";

export function PublicChatWidget() {
  return <ChatWidget isAuthenticated={false} />;
}
