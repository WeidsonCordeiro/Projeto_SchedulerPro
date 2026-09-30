import { HydratedDocument, Schema, Types, model } from "mongoose";

export interface ISession {
  userId: Types.ObjectId;
  sessionStartedAt: Date;
  lastActivityAt: Date;
  revokedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const SessionSchema = new Schema<ISession>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    sessionStartedAt: {
      type: Date,
      required: true,
      default: () => new Date(),
    },

    lastActivityAt: {
      type: Date,
      required: true,
      default: () => new Date(),
    },

    revokedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    collection: "sessions",
  },
);

SessionSchema.index({ userId: 1 });
SessionSchema.index({ revokedAt: 1 });
SessionSchema.index({ sessionStartedAt: 1 });

export type SessionDocument = HydratedDocument<ISession> & {
  _id: Types.ObjectId;
};

const Session = model<ISession>("Session", SessionSchema);

export default Session;
