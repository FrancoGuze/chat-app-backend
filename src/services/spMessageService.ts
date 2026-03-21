import { ContactRepository, MessageRepository, UserRepository } from "../repository/repositoriesTypes.js";
import { MessageData } from "../types.js";
import { MessageService } from "./servicesTypes.js";

export class SupabaseMessageService implements MessageService {
    constructor(private userRepo: UserRepository, private contactRepo: ContactRepository, private messageRepo: MessageRepository) { }
    /**
     * Validates the message payload, ensures contacts, and persists the message.
     *
     * @param payload
     * @returns
     */
    async sendMessage(payload: MessageData) {
        if (payload.type !== 'msg') {
            console.error("Payload type is not 'msg'")
            return { saved: false, createdContact: false }
        }
        const userId = payload.from
        const contactId = payload.to
        const message = payload.message

        if (!userId || !contactId || !message || message.trim() === "") {
            console.error("Invalid message payload")
            return { saved: false, createdContact: false }
        }

        const { created } = await this.contactRepo.ensureMutualContact(userId, contactId)
        const { saved } = await this.messageRepo.saveMessage(payload)

        return { saved, createdContact: created }

    }
    /**
     * Restores all messages for a given user.
     *
     * @param userId
     * @returns
     */
    async restoreMessages(userId: string) {
        if (!userId || userId.trim() === "") return []
        const messages = await this.messageRepo.listMessagesForUser(userId)
        return messages
    }
    /**
     * This function is used to update the status of an array of messages (using their ids) based on the specified status
     * 
     * @param ids 
     * @param status 
     * @returns 
     */
    async updateMessageStatus(ids: string[], status: MessageData['status']) {
        if (!ids || ids.length === 0) {
            return { updated: false, amount: 0 }
        }
        if (!status) {
            return { updated: false, amount: 0 }
        }
        return this.messageRepo.updateStatus(ids, status)
    }
}
