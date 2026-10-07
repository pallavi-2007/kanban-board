import mongoose from 'mongoose';

const checklistItemSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      trim: true,
      default: function () {
        return this.title || '';
      }
    },
    title: {
      type: String,
      trim: true,
      default: function () {
        return this.text || '';
      }
    },
    done: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

const cardSchema = new mongoose.Schema(
  {
    board: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Board',
      required: [true, 'Board ID is required'],
      index: true
    },
    list: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'List',
      required: [true, 'List ID is required'],
      index: true
    },
    title: {
      type: String,
      required: [true, 'Card title is required'],
      trim: true
    },
    description: {
      type: String,
      trim: true,
      default: ''
    },
    position: {
      type: Number,
      required: true,
      default: 0
    },
    assignees: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    dueDate: {
      type: Date,
      default: null
    },
    labels: {
      type: [String],
      default: []
    },
    checklist: {
      type: [checklistItemSchema],
      default: []
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
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

cardSchema.index({ list: 1, position: 1 });

const Card = mongoose.model('Card', cardSchema);

export default Card;
