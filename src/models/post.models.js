import mongoose, {Schema} from "mongoose";

const postSchema = new Schema (
    {
        postTitle: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true, 
            index: true
        },
        postContent: {
            type: String,
            required: true,
        },
        postMedia: {
            type: String // from cloudinary [later]
        },
        owner: {
            type: Schema.Types.ObjectId,
            ref: User
        }
    }, {timestamps: true} 
)

postSchema.plugin(mongooseAggregatePaginate)

export const Post = mongoose.model("Post", postSchema)