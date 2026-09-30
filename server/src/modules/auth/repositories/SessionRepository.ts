import { ClientSession, Types } from "mongoose";
import Session, { SessionDocument } from "../models/Session.model";

class SessionRepository {
  public async create(
    userId: string | Types.ObjectId,
    mongoSession?: ClientSession,
  ): Promise<SessionDocument> {
    const now = new Date();

    const [session] = await Session.create(
      [
        {
          userId,
          sessionStartedAt: now,
          lastActivityAt: now,
        },
      ],
      { session: mongoSession },
    );

    return session;
  }

  public async findById(
    id: string | Types.ObjectId,
  ): Promise<SessionDocument | null> {
    return Session.findById(id);
  }

  public async touch(id: string | Types.ObjectId): Promise<void> {
    await Session.updateOne({ _id: id }, { lastActivityAt: new Date() });
  }

  public async revoke(id: string | Types.ObjectId): Promise<void> {
    await Session.updateOne({ _id: id }, { revokedAt: new Date() });
  }
}

export default new SessionRepository();
