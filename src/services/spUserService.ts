import type { UserRepository, ContactRepository } from "../repository/repositoriesTypes.js";

type User = {
    id: string;
    name: string;
    created_at: Date;
};

type AuthResult = {
    user: User | null;
    contacts: User[];
};

export class SupabaseUserService implements SupabaseUserService {
    constructor(
        private userRepo: UserRepository,
        private contactRepo: ContactRepository
    ) { }

    /**
     * Authenticates a user by name. If the user does not exist, it will be created.
     * Then it loads the user's contacts to restore state on login.
     *
     * @param name
     * @returns
     */
    async authenticateUser(name: string) {
        const user = await this.userRepo.findOrCreateByName(name);
        if (!user) {
            return { user: null, contacts: [] };
        }

        const contacts = await this.contactRepo.listContacts(user.id);
        return { user, contacts };
    }
}
