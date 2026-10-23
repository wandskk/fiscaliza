export interface Email {
  to: string;
  subject: string;
  text: string;
}

// Sends one message to one person; throws when the delivery was refused or could not be tried
export interface Notifier {
  send(email: Email): Promise<void>;
}
