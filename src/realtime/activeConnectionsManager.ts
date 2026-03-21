import type { MyWebSocket } from "../types.js";

type ConnectionManager = {
    add: (userId: string, socket: MyWebSocket) => void;
    get: (userId: string) => MyWebSocket | undefined;
    remove: (userId: string) => boolean;
};

export class ActiveConnectionsManager implements ConnectionManager {
    private activeUsers = new Map<string, MyWebSocket>();

    add(userId: string, socket: MyWebSocket) {
        if (!userId) return;
        this.activeUsers.set(userId, socket);
    }

    get(userId: string) {
        if (!userId) return undefined;
        return this.activeUsers.get(userId);
    }

    remove(userId: string) {
        if (!userId) return false;
        return this.activeUsers.delete(userId);
    }
}
