export type ChatRole = "user" | "assistant" | "system";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export type RouteName = "curiosity" | "data";

export interface RouteModels {
  curiosity: string;
  data: string;
}

export interface RouteDecision {
  route: RouteName;
  model: string;
}

export type BrokerStreamEvent =
  | { type: "meta"; route: RouteName; model: string }
  | { type: "token"; content: string }
  | { type: "done" }
  | { type: "error"; message: string };
