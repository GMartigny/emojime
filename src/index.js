import { TinyFaceDetectorOptions, nets, DetectAllFacesTask, resizeResults } from "face-api.js";
import Scene from "@pencil.js/scene";
import Position from "@pencil.js/position";
import Text from "@pencil.js/text";
import "./style.css";

// Load every model we need
const loadModels = () => {
    const modelURI = "./models";
    return Promise.all([
        nets.tinyFaceDetector.loadFromUri(modelURI), // Face detection
        nets.faceExpressionNet.loadFromUri(modelURI), // Expression detection
        nets.faceLandmark68TinyNet.loadFromUri(modelURI), // Landmarks detection
    ]);
};

// Create a video element bound to the webcam
const startVideo = async (container) => {
    const video = document.createElement("video");
    video.style.position = "absolute";
    const measures = container.getBoundingClientRect();
    video.width = measures.width;
    video.height = measures.height;
    video.setAttribute("autoplay", true);
    video.setAttribute("muted", true);

    container.appendChild(video);

    try {
        // Ask user for permission
        video.srcObject = await navigator.mediaDevices.getUserMedia(
            {
                video: true,
            },
        );

        return video;
    }
    catch (error) {
        console.error(error.message);
    }

    return null;
};

const useTinyModel = true;
const tinyFaceOptions = new TinyFaceDetectorOptions({
    scoreThreshold: 0.1, // Lower score reduce emoji disappearance
});
// Run the face detection on a source element
const recognise = async source => new DetectAllFacesTask(source, tinyFaceOptions)
    .withFaceLandmarks(useTinyModel)
    .withFaceExpressions(useTinyModel);

// Search all expression score for the bigger one
const getBest = scores => Object.keys(scores).reduce((acc, val) => {
    if (!acc || scores[val] > scores[acc]) {
        return val;
    }

    return acc;
});

// Start function
const run = async () => {
    await loadModels();

    const size = {
        width: 960,
        height: 720,
    };

    // Title
    const title = document.createElement("h1");
    title.textContent = "FaceMoji";
    document.body.appendChild(title);

    // Container element
    const container = document.createElement("main");
    container.style.width = `${size.width}px`;
    container.style.height = `${size.height}px`;
    document.body.appendChild(container);

    // The video from the webcam
    const video = await startVideo(container);

    // Overlay canvas to draw the emoji
    const overlay = new Scene(container);

    // All possible faces
    const faces = {
        angry: "😠",
        disgusted: "🤢",
        fearful: "😨",
        happy: "😀",
        neutral: "😑",
        sad: "😭",
        surprised: "😲",
    };

    // The overlaid emoji
    const emojis = [];
    const emojisOptions = {
        align: Text.alignments.center,
    };

    // Run detection on each frames
    const eachFrame = async () => {
        const results = await recognise(video);
        emojis.forEach(emoji => emoji.hide());

        if (results && results.length) {
            results.forEach((result, index) => {
                const emoji = emojis[index] || new Text(undefined, "", emojisOptions);

                if (!emojis[index]) {
                    emojis[index] = emoji;
                    overlay.add(emoji);
                }
                emoji.show();

                const resized = resizeResults(result, size);

                // Change expression
                const expression = getBest(resized.expressions);
                emoji.text = faces[expression];

                // Move and resize emoji
                const { width, height } = resized.detection.box;
                const nose = resized.landmarks.getNose()[1];
                const nosePosition = new Position(nose.x, nose.y);
                emoji.position.set(nosePosition);
                emoji.options.fontSize = Math.max(width, height);
                emoji.options.origin.y = -emoji.options.fontSize / 2;

                // Rotate emoji
                const mouth = resized.landmarks.getMouth()[3];
                emoji.options.rotation = nosePosition.clone().subtract(mouth.x, mouth.y).angle;
            });
        }
    };

    // Start the scene loop and register the function on each frame
    overlay
        .startLoop()
        .on(Scene.events.draw, eachFrame, true);
};

// Start everything
run();
