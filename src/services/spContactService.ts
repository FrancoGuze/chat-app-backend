import { ContactRepository, UserRepository } from "../repository/repositoriesTypes.js";
import { ContactService } from "./servicesTypes.js";

export class SupabaseContactService implements ContactService {
    constructor(private contactRepo: ContactRepository) {
    }
    /**
     * Ensures a mutual contact relationship between two users.
     *
     * @param userId
     * @param contactId
     * @returns
     */
    async ensureContactPair(userId: string, contactId: string) {
        if (!userId || !contactId) {
            console.error("userId or contactId invalid")
            return { created: false }
        }
        return this.contactRepo.ensureMutualContact(userId, contactId)
    }

}
