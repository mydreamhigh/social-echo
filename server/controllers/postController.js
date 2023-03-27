const dayjs = require("dayjs");
const relativeTime = require("dayjs/plugin/relativeTime");
dayjs.extend(relativeTime);
const getUserFromToken = require("../utils/getUserFromToken");

const Post = require("../models/Post");
const Community = require("../models/Community");
const Comment = require("../models/Comment");
const User = require("../models/User");
const Relationship = require("../models/Relationship");

const createPost = async (req, res) => {
  try {
    const userId = req.body.user;
    //check if user is a member of the community
    const isMember = await Community.findOne({
      _id: req.body.community,
      members: userId,
    });

    if (!isMember) {
      return res.status(401).json({
        message: "Unauthorized to post in this community",
      });
    }

    let newPost;

    if (req.files && req.files.length > 0) {
      const { filename } = req.files[0];
      const fileUrl = `${req.protocol}://${req.get(
        "host"
      )}/assets/userFiles/${filename}`;
      newPost = new Post({
        user: req.body.user,
        community: req.body.community,
        body: req.body.body,
        fileUrl: fileUrl,
      });
    } else {
      newPost = new Post({
        user: req.body.user,
        community: req.body.community,
        body: req.body.body,
        fileUrl: null,
      });
    }

    await newPost.save();
    return res.status(201).json({
      message: "Post created successfully",
    });
  } catch (error) {
    return res.status(409).json({
      message: "Error creating post",
    });
  }
};

/**
Retrieves the posts for a given user, including pagination, sorted by creation date.
@name getPosts
@async
@param {Object} req - The request object from Express.
@param {string} req.query.userId - The ID of the user whose posts to retrieve.
@param {number} [req.query.limit=10] - The maximum number of posts to retrieve. Defaults to 10 if not provided.
@param {number} [req.query.skip=0] - The number of posts to skip before starting to retrieve them. Defaults to 0 if not provided.
@param {Object} res - The response object from Express.
@returns {Promise<void>} - A Promise that resolves to the response JSON object containing the retrieved posts.
@throws {Error} - If an error occurs while retrieving the posts.
*/
const getPosts = async (req, res) => {
  try {
    const userId = req.query.userId;
    const limit = parseInt(req.query.limit) || 10;
    const skip = parseInt(req.query.skip) || 0;

    const communities = await Community.find({
      members: userId,
    });
    const communityIds = communities.map((community) => community._id);

    const posts = await Post.find({
      community: {
        $in: communityIds,
      },
    })
      .sort({
        createdAt: -1,
      })
      .populate("user", "name avatar")
      .populate("community", "name")
      .skip(skip)
      .limit(limit)
      .lean();

    const formattedPosts = posts.map((post) => ({
      ...post,
      createdAt: dayjs(post.createdAt).fromNow(),
    }));

    res.status(200).json(formattedPosts);
  } catch (error) {
    res.status(404).json({
      message: "Posts not found",
    });
  }
};

/**
Retrieves the posts for a given community, including the post information, the user who created it, and the community it belongs to.
@name getCommunityPosts
@async
@param {Object} req - The request object from Express.
@param {string} req.params.id - The ID of the community to retrieve the posts for.
@param {Object} req.query - The query parameters for the request.
@param {number} [req.query.limit=10] - The maximum number of posts to retrieve. Defaults to 10 if not specified.
@param {number} [req.query.skip=0] - The number of posts to skip before starting to retrieve them. Defaults to 0 if not specified.
@param {Object} res - The response object from Express.
@returns {Promise<void>} - A Promise that resolves to the response JSON object.
@throws {Error} - If an error occurs while retrieving the posts.
*/
const getCommunityPosts = async (req, res) => {
  try {
    const id = req.params.id;
    const limit = parseInt(req.query.limit) || 10;
    const skip = parseInt(req.query.skip) || 0;

    const posts = await Post.find({
      community: id,
    })
      .sort({
        createdAt: -1,
      })
      .populate("user", "name avatar")
      .populate("community", "name")
      .skip(skip)
      .limit(limit)
      .lean();
    const formattedPosts = posts.map((post) => ({
      ...post,
      createdAt: dayjs(post.createdAt).fromNow(),
    }));

    res.status(200).json(formattedPosts);
  } catch (error) {
    res.status(500).json({
      message: "Server error",
    });
  }
};

/**
Deletes a post with the specified ID and its associated comments.
@name deletePost
@async
@param {Object} req - The request object from Express.
@param {string} req.params.id - The ID of the post to be deleted.
@param {Object} res - The response object from Express.
@returns {Promise<void>} - A Promise that resolves to the response JSON object.
@throws {Error} - If the specified post cannot be found or if there is an error while deleting it.
*/
const deletePost = async (req, res) => {
  try {
    const id = req.params.id;
    const post = await Post.findById(id);
    if (!post) throw new Error("Post not found");
    await post.remove();
    res.status(200).json({
      message: "Post deleted successfully",
    });
  } catch (error) {
    res.status(404).json({
      message: "Post not found. It may have been deleted already",
    });
  }
};
const likePost = async (req, res) => {
  try {
    const id = req.params.id;
    const { userId } = req.body;
    const updatedPost = await Post.findOneAndUpdate(
      {
        _id: id,
        likes: {
          $ne: userId,
        },
      },
      {
        $addToSet: {
          likes: userId,
        },
      },
      {
        new: true,
      }
    )
      .populate("user", "name avatar")
      .populate("community", "name");

    if (!updatedPost) {
      return res.status(404).json({
        message: "Post not found. It may have been deleted already",
      });
    }

    const formattedPost = {
      ...updatedPost.toObject(),
      createdAt: dayjs(updatedPost.createdAt).fromNow(),
    };

    res.status(200).json(formattedPost);
  } catch (error) {
    res.status(500).json({
      message: "Server error",
    });
  }
};

const unlikePost = async (req, res) => {
  try {
    const id = req.params.id;
    const { userId } = req.body;

    const updatedPost = await Post.findOneAndUpdate(
      {
        _id: id,
        likes: userId,
      },
      {
        $pull: {
          likes: userId,
        },
      },
      {
        new: true,
      }
    )
      .populate("user", "name avatar")
      .populate("community", "name");

    if (!updatedPost) {
      return res.status(404).json({
        message: "Post not found. It may have been deleted already",
      });
    }

    const formattedPost = {
      ...updatedPost.toObject(),
      createdAt: dayjs(updatedPost.createdAt).fromNow(),
    };

    res.status(200).json(formattedPost);
  } catch (error) {
    res.status(500).json({
      message: "Server error",
    });
  }
};

const addComment = async (req, res) => {
  try {
    const { body, user, post } = req.body.newComment;
    const newComment = new Comment({
      body,
      user,
      post,
    });
    await newComment.save();
    await Post.findOneAndUpdate(
      {
        _id: post,
      },
      {
        $addToSet: {
          comments: newComment._id,
        },
      }
    );
    res.status(200).json({
      message: "Comment added successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error",
    });
  }
};

const getComments = async (req, res) => {
  try {
    const id = req.params.id;
    const comments = await Comment.find({
      post: id,
    })
      .sort({
        createdAt: -1,
      })
      .populate("user", "name avatar")
      .lean();

    const formattedComments = comments.map((comment) => ({
      ...comment,
      createdAt: dayjs(comment.createdAt).fromNow(),
    }));

    res.status(200).json(formattedComments);
  } catch (error) {
    res.status(500).json({
      message: "Server error",
    });
  }
};

const saveOrUnsavePost = async (req, res, operation) => {
  try {
    const id = req.params.id;
    const userId = getUserFromToken(req);
    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }
    const update = {};
    update[operation === "$addToSet" ? "$addToSet" : "$pull"] = {
      savedPosts: id,
    };
    const updatedUserPost = await User.findOneAndUpdate(
      {
        _id: userId,
      },
      update,
      {
        new: true,
      }
    )
      .select("savedPosts")
      .populate({
        path: "savedPosts",
        populate: {
          path: "community",
          select: "name",
        },
      });

    if (!updatedUserPost) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const formattedPosts = updatedUserPost.savedPosts.map((post) => ({
      ...post.toObject(),
      createdAt: dayjs(post.createdAt).fromNow(),
    }));

    res.status(200).json(formattedPosts);
  } catch (error) {
    res.status(500).json({
      message: "Server error",
    });
  }
};

const savePost = async (req, res) => {
  await saveOrUnsavePost(req, res, "$addToSet");
};

const unsavePost = async (req, res) => {
  await saveOrUnsavePost(req, res, "$pull");
};

const getSavedPosts = async (req, res) => {
  try {
    const userId = getUserFromToken(req);
    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    // Send saved posts of communities user is a member of only
    const communityIds = await Community.find({ members: userId }).distinct(
      "_id"
    );
    const savedPosts = await Post.find({
      community: { $in: communityIds },
      _id: { $in: user.savedPosts },
    })
      .populate("user", "name avatar")
      .populate("community", "name");

    const formattedPosts = savedPosts.map((post) => ({
      ...post.toObject(),
      createdAt: dayjs(post.createdAt).fromNow(),
    }));

    res.status(200).json(formattedPosts);
  } catch (error) {
    res.status(500).json({
      message: "Server error",
    });
  }
};

/**
Retrieves up to 10 posts of the public user that are posted in the communities that both the public user and the current user are members of.
@name getPublicPosts
@async
@param {Object} req - The request object from Express.
@param {string} req.params.publicUserId - The id of the public user whose posts to retrieve.
@param {Object} res - The response object from Express.
@returns {Promise<void>} - A Promise that resolves to the response JSON object.
@throws {Error} - If an error occurs while retrieving the posts.
*/
const getPublicPosts = async (req, res) => {
  try {
    const publicUserId = req.params.publicUserId;
    const currentUserId = getUserFromToken(req);
    if (!currentUserId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // check if the current user is following the public user
    const isFollowing = await Relationship.exists({
      follower: currentUserId,
      following: publicUserId,
    });
    if (!isFollowing) {
      return null;
    }

    // get the ids of the communities that both users are members of
    const commonCommunityIds = await Community.find({
      members: { $all: [currentUserId, publicUserId] },
    }).distinct("_id");

    // get the posts that belong to the common communities and are posted by the public user
    const publicPosts = await Post.find({
      community: { $in: commonCommunityIds },
      user: publicUserId,
    })
      .populate("user", "_id name avatar")
      .populate("community", "_id name")
      .sort("-createdAt")
      .limit(10)
      .exec();

    res.status(200).json(publicPosts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getPosts,
  createPost,
  getCommunityPosts,
  deletePost,
  likePost,
  unlikePost,
  addComment,
  getComments,
  savePost,
  unsavePost,
  getSavedPosts,
  getPublicPosts,
};
