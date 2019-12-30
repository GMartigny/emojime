import { TinyFaceDetectorOptions, nets, DetectAllFacesTask, resizeResults } from "face-api.js";
import Scene from "@pencil.js/scene";
import Position from "@pencil.js/position";
import Text from "@pencil.js/text";
import Arc from "@pencil.js/arc";
import "github-corner";
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

    // Ask user for permission
    video.srcObject = await navigator.mediaDevices.getUserMedia({
        video: true,
    });

    container.appendChild(video);

    return video;
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
    let modelReady = false;
    loadModels().then(() => modelReady = true);

    const size = {
        width: 960,
        height: 720,
    };

    document.body.innerHTML = `
<github-corner fill="#333">
    <a href="https://github.com/GMartigny/emojime"></a>
</github-corner>
<h1>Emojime</h1>
<main style="width: ${size.width}px;height: ${size.height}px" id="container">
    <p>Enable your camera</p>
</main>`;

    const container = document.getElementById("container");

    // The video from the webcam
    let video;
    try {
        video = await startVideo(container);
    }
    catch (e) {
        // Webcam unsupported or blocked
        return;
    }

    // Overlay canvas to draw the emoji
    const overlay = new Scene(container);

    // Loader while model are fetched
    const loader = new Arc(overlay.center, 100, 100, 0, 0.5, {
        stroke: "#ff0e3f",
        strokeWidth: 20,
        shadow: {
            color: "#333",
            blur: 10,
        },
    });

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
        if (modelReady) {
            loader.hide();
        }
        else {
            loader.options.rotation += 0.01;
            loader.endAngle += Math.cos(loader.frameCount / 50) / 105;
            return;
        }

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
        .add(loader)
        .startLoop()
        .on(Scene.events.draw, eachFrame, true);
};

// Start everything
run();
