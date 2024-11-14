import {
    Client,
    Account,
    ID,
    Avatars,
    Databases,
    Query,
    Storage,
} from "react-native-appwrite";

export const config = {
    endpoint: "https://cloud.appwrite.io/v1",
    platform: "com.jsm.expo-aora",
    projectId: "6623f1e322a1a328f7da",
    databaseId: "6623f398e2b37daff2cb",
    userCollectionId: "6623f3bf631b48989e66",
    videoCollectionId: "6623f3df962c5af545c1",
    storageId: "6623f60ee8854076f993",
};

const {
    endpoint,
    platform,
    projectId,
    databaseId,
    userCollectionId,
    videoCollectionId,
    storageId,
} = config;

// Initialize the SDK
const client = new Client();

client.setEndpoint(endpoint).setProject(projectId).setPlatform(platform);

const account = new Account(client);
const avatar = new Avatars(client);
const database = new Databases(client);
const storage = new Storage(client);

export const createUser = async (email, password, username) => {
    try {
        const newAccount = await account.create(
            ID.unique(),
            email,
            password,
            username
        );

        if (!newAccount) throw Error;

        const avatarUrl = avatar.getInitials(username);

        await signIn(email, password);

        const newUser = await database.createDocument(
            databaseId,
            userCollectionId,
            ID.unique(),
            {
                accountId: newAccount.$id,
                email,
                username,
                avatar: avatarUrl,
            }
        );

        return newUser;
    } catch (error) {
        console.log(error);
        throw new Error(error);
    }
};

export const signIn = async (email, password) => {
    try {
        const session = await account.createEmailSession(email, password);
        return session;
    } catch (error) {
        console.log(error);
    }
};

export const getCurrentUser = async () => {
    try {
        const currentAccount = await account.get();

        if (!currentAccount) throw Error;

        const currentUser = await database.listDocuments(
            databaseId,
            userCollectionId,
            [Query.equal("accountId", currentAccount.$id)]
        );

        if (!currentUser) throw Error;

        return currentUser.documents[0];
    } catch (error) {
        console.log(error);
    }
};

export const getAllPosts = async () => {
    try {
        const posts = await database.listDocuments(
            databaseId,
            videoCollectionId,
            [Query.orderDesc('$createdAt')]
        );
        return posts.documents;
    } catch (error) {
        throw new Error(error);
    }
};

export const getLatestPosts = async () => {
    try {
        const posts = await database.listDocuments(
            databaseId,
            videoCollectionId,
            [Query.orderDesc("$createdAt", Query.limit(8))]
        );
        return posts.documents;
    } catch (error) {
        throw new Error(error);
    }
};

export const searchPosts = async (query) => {
    try {
        const posts = await database.listDocuments(
            databaseId,
            videoCollectionId,
            [Query.search("title", query)]
        );
        return posts.documents;
    } catch (error) {
        throw new Error(error);
    }
};

export const getUserPosts = async (userId) => {
    try {
        const posts = await database.listDocuments(
            databaseId,
            videoCollectionId,
            [Query.search("creator", userId), Query.orderDesc("$createdAt")]
        );
        return posts.documents;
    } catch (error) {
        throw new Error(error);
    }
};

export const signOut = async () => {
    try {
        const session = await account.deleteSession("current");
        return session;
    } catch (error) {
        throw new Error(error);
    }
};

const getFilePreview = async (fileId, type) => {
    let fileURL;

    try {
        if (file === "video") {
            fileURL = storage.getFileView(storageId, fileId);
        } else if (type === "image") {
            fileURL = storage.getFilePreview(
                storageId,
                fileId,
                2000,
                2000,
                "top",
                100
            );
        } else {
            throw new Error("Invalid file type");
        }

        if (!fileURL) throw Error;
        return fileURL;
    } catch (error) {
        throw new Error(error);
    }
};

const uploadFile = async (file, type) => {
    if (!file) return;

    const asset = {
        name: file.fileName,
        type: file.mimeType,
        size: file.fileSize,
        uri: file.uri,
    };

    try {
        const uploadedFile = await storage.createFile(
            storageId,
            ID.unique(),
            asset
        );

        const fileURL = await getFilePreview(uploadedFile.$id, type);
        return fileURL;
    } catch (error) {
        throw new Error(error);
    }
};

export const createVideoPost = async (form) => {
    try {
        const [thumbnailURL, videoURL] = await Promise.all([
            uploadFile(form.thumbnail, "image"),
            uploadFile(form.video, "video"),
        ]);

        const newPost = await database.createDocument(
            databaseId,
            videoCollectionId,
            ID.unique(),
            {
                title: form.title,
                thumbnail: thumbnailURL,
                video: videoURL,
                prompt: form.prompt,
                creator: form.userId,
            }
        );

        return newPost;
    } catch (error) {
        throw new Error(error);
    }
};
