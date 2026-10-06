import mongoose from 'mongoose';

const listSchema = new mongoose.Schema(
  {
    board: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Board',
      required: [true, 'Board ID is required'],
      index: true
    },
    title: {
      type: String,
      required: [true, 'List title is required'],
      trim: true
    },
    position: {
      type: Number,
      required: true,
      default: 0
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        delete ret.__v;
        return ret;
      }
    }
  }
);

listSchema.index({ board: 1, position: 1 });

const List = mongoose.model('List', listSchema);

export default List;
