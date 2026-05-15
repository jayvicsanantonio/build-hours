export type RealtimeResponseRequestReason = 'transcript' | 'typed' | 'tool' | 'queued';

export interface RealtimeResponseRequest {
  shouldCreateResponse: boolean;
  reason?: RealtimeResponseRequestReason;
  text?: string;
}

export interface RealtimeResponseController {
  beginAudioTurn(): void;
  markSpeechStopped(): RealtimeResponseRequest;
  completeTranscript(text: string): RealtimeResponseRequest;
  requestTextTurn(text: string): RealtimeResponseRequest;
  markResponseCreated(responseId?: string): void;
  markResponseRequestFailed(): void;
  markResponseDone(responseId?: string): RealtimeResponseRequest;
  beginToolCall(callId?: string): void;
  completeToolCall(callId?: string): RealtimeResponseRequest;
  requestToolContinuation(): RealtimeResponseRequest;
  reset(): void;
}

const noResponse: RealtimeResponseRequest = { shouldCreateResponse: false };

export function createRealtimeResponseController(): RealtimeResponseController {
  let waitingForTranscript = false;
  let responseRequested = false;
  let responseActive = false;
  let toolCallActive = false;
  let continuationPending = false;
  let queuedTurnText: string | null = null;

  function canCreateResponse() {
    return !responseRequested && !responseActive && !toolCallActive;
  }

  function requestResponse(reason: RealtimeResponseRequestReason, text?: string): RealtimeResponseRequest {
    if (!canCreateResponse()) {
      if (text?.trim()) queuedTurnText = text.trim();
      return noResponse;
    }

    responseRequested = true;
    return {
      shouldCreateResponse: true,
      reason,
      ...(text ? { text } : {}),
    };
  }

  function drainPendingResponse(): RealtimeResponseRequest {
    if (toolCallActive) return noResponse;
    if (responseRequested || responseActive) return noResponse;

    if (continuationPending) {
      continuationPending = false;
      responseRequested = true;
      return { shouldCreateResponse: true, reason: 'tool' };
    }

    if (queuedTurnText) {
      const text = queuedTurnText;
      queuedTurnText = null;
      responseRequested = true;
      return { shouldCreateResponse: true, reason: 'queued', text };
    }

    return noResponse;
  }

  return {
    beginAudioTurn() {
      waitingForTranscript = true;
    },
    markSpeechStopped() {
      return noResponse;
    },
    completeTranscript(text: string) {
      const trimmedText = text.trim();
      if (!waitingForTranscript || !trimmedText) {
        waitingForTranscript = false;
        return noResponse;
      }

      waitingForTranscript = false;
      return requestResponse('transcript', trimmedText);
    },
    requestTextTurn(text: string) {
      const trimmedText = text.trim();
      if (!trimmedText) return noResponse;
      return requestResponse('typed', trimmedText);
    },
    markResponseCreated() {
      responseRequested = true;
      responseActive = true;
    },
    markResponseRequestFailed() {
      responseRequested = false;
      responseActive = false;
    },
    markResponseDone() {
      responseRequested = false;
      responseActive = false;
      return drainPendingResponse();
    },
    beginToolCall() {
      toolCallActive = true;
    },
    completeToolCall() {
      toolCallActive = false;
      return drainPendingResponse();
    },
    requestToolContinuation() {
      if (!canCreateResponse()) {
        continuationPending = true;
        return noResponse;
      }

      responseRequested = true;
      return { shouldCreateResponse: true, reason: 'tool' };
    },
    reset() {
      waitingForTranscript = false;
      responseRequested = false;
      responseActive = false;
      toolCallActive = false;
      continuationPending = false;
      queuedTurnText = null;
    },
  };
}
