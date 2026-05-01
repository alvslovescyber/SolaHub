import * as signalR from '@microsoft/signalr'
import { tokenStorage } from './http/client'

export type CollaborationEvent =
  | { type: 'UserJoined'; userId: string; joinedAt: string }
  | { type: 'UserLeft'; userId: string; leftAt: string }
  | {
      type: 'ProgressUpdated'
      planId: string
      userId: string
      dayNumber: number
      updatedAt: string
    }
  | {
      type: 'AnnotationReceived'
      planId: string
      userId: string
      verseRef: string
      content: string
      sentAt: string
    }
  | {
      type: 'PresenterVerseChanged'
      planId: string
      presenterUserId: string
      verseRef: string
      pushedAt: string
    }

type EventHandler = (event: CollaborationEvent) => void

class CollaborationService {
  private connection: signalR.HubConnection | null = null
  private handlers = new Set<EventHandler>()
  private joinedPlans = new Set<string>()

  private buildConnection(): signalR.HubConnection {
    const base = import.meta.env.VITE_API_URL ?? 'http://localhost:5000'
    return new signalR.HubConnectionBuilder()
      .withUrl(`${base}/hubs/collaboration`, {
        accessTokenFactory: () => tokenStorage.getAccess() ?? '',
      })
      .withAutomaticReconnect([0, 2_000, 5_000, 10_000, 30_000])
      .configureLogging(signalR.LogLevel.Warning)
      .build()
  }

  async connect(): Promise<void> {
    if (this.connection?.state === signalR.HubConnectionState.Connected) return

    this.connection = this.buildConnection()
    this.registerHandlers()

    await this.connection.start()

    // Re-join all plans after reconnect
    this.connection.onreconnected(() => {
      for (const planId of this.joinedPlans) {
        void this.connection!.invoke('JoinPlan', planId)
      }
    })
  }

  async disconnect(): Promise<void> {
    this.joinedPlans.clear()
    await this.connection?.stop()
    this.connection = null
  }

  async joinPlan(planId: string): Promise<void> {
    if (!this.connection) return
    this.joinedPlans.add(planId)
    await this.connection.invoke('JoinPlan', planId)
  }

  async leavePlan(planId: string): Promise<void> {
    if (!this.connection) return
    this.joinedPlans.delete(planId)
    await this.connection.invoke('LeavePlan', planId)
  }

  async broadcastProgress(planId: string, dayNumber: number): Promise<void> {
    await this.connection?.invoke('BroadcastProgress', planId, dayNumber)
  }

  async broadcastAnnotation(planId: string, verseRef: string, content: string): Promise<void> {
    await this.connection?.invoke('BroadcastAnnotation', planId, verseRef, content)
  }

  async pushPresenterVerse(planId: string, verseRef: string): Promise<void> {
    await this.connection?.invoke('PushPresenterVerse', planId, verseRef)
  }

  on(handler: EventHandler): () => void {
    this.handlers.add(handler)
    return () => this.handlers.delete(handler)
  }

  private emit(event: CollaborationEvent): void {
    for (const handler of this.handlers) {
      handler(event)
    }
  }

  private registerHandlers(): void {
    if (!this.connection) return

    this.connection.on('UserJoined', (data) => this.emit({ type: 'UserJoined', ...data }))
    this.connection.on('UserLeft', (data) => this.emit({ type: 'UserLeft', ...data }))
    this.connection.on('ProgressUpdated', (data) => this.emit({ type: 'ProgressUpdated', ...data }))
    this.connection.on('AnnotationReceived', (data) =>
      this.emit({ type: 'AnnotationReceived', ...data })
    )
    this.connection.on('PresenterVerseChanged', (data) =>
      this.emit({ type: 'PresenterVerseChanged', ...data })
    )
  }
}

// Singleton — one hub connection per app session
export const collaborationService = new CollaborationService()
