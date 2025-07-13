import mongoose, {Schema} from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const postSchema = new Schema (
    {
        postTitle: {
            type: String,
            required: true,
            // unique: true,
            // trim: true, 
            // index: true
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
            ref: "User"
        },
        postNumber: {
            type: Number,
            required: true,
        }
    }, {timestamps: true} 
)

postSchema.pre("validate", async function(next) {
    if (this.isNew) {
        try {
            const lastPost = await this.constructor.findOne({ owner: this.owner })
                .sort({ postNumber: -1 })
                .select("postNumber");
            this.postNumber = (lastPost && typeof lastPost.postNumber === "number")
                ? lastPost.postNumber + 1
                : 1;
        } catch (err) {
            this.postNumber = 1;
        }
    }
    next();
});

postSchema.plugin(mongooseAggregatePaginate);

export const Post = mongoose.model("Post", postSchema)