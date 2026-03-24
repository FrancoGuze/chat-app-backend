import { MessageData } from "../types.js";

type User = {
    id: string
    name: string;
    created_at: Date
}

export interface UserRepository {
    create: (name: string) => Promise<User | null>,
    findByName: (name: string) => Promise<User | null>,
    findById: (id: string) => Promise<User | null>,
    findOrCreateByName: (name: string) => Promise<User | null>
}

export interface ContactRepository {
    ensureContact: (userA: string, userB: string) => Promise<{ created: boolean }>,
    ensureMutualContact: (userA: string, userB: string) => Promise<{ created: boolean }>,
    listContacts: (id: string) => Promise<User[]>

}
export interface MessageRepository {
    saveMessage: (message: MessageData) => Promise<{ saved: boolean }>,
    updateStatus: (ids: string[], status: MessageData['status']) => Promise<{ updated: boolean, amount?: number }>;
    listMessagesForUser: (userId: string) => Promise<MessageData[]>

}
