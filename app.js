import * as THREE from "https://unpkg.com/three@0.166.1/build/three.module.js";
import { ARButton } from "https://unpkg.com/three@0.166.1/examples/jsm/webxr/ARButton.js";

let scene, camera, renderer;

let hitTestSource = null;
let hitTestSourceRequested = false;

let cylinderPlaced = false;

init();

function init() {

    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(
        70,
        window.innerWidth / window.innerHeight,
        0.01,
        1000
    );

    renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true
    });

    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;

    document.body.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1));

    document.body.appendChild(
        ARButton.createButton(renderer, {
            requiredFeatures: ["hit-test"]
        })
    );

    renderer.setAnimationLoop(render);
}

function placeOnce(matrix) {

    const geo = new THREE.CylinderGeometry(0.15, 0.15, 0.3, 32);

    const mat = new THREE.MeshStandardMaterial({
        color: 0x00ff00,
        transparent: true,
        opacity: 0.7
    });

    const cylinder = new THREE.Mesh(geo, mat);

    cylinder.position.setFromMatrixPosition(matrix);

    scene.add(cylinder);
}

function render(_, frame) {

    if (frame) {

        const refSpace = renderer.xr.getReferenceSpace();
        const session = renderer.xr.getSession();

        if (!hitTestSourceRequested) {

            session.requestReferenceSpace("viewer")
                .then((space) => {

                    session.requestHitTestSource({ space })
                        .then((source) => {
                            hitTestSource = source;
                        });
                });

            hitTestSourceRequested = true;
        }

        if (hitTestSource) {

            const hits = frame.getHitTestResults(hitTestSource);

            if (hits.length > 0) {

                const pose = hits[0].getPose(refSpace);

                if (!cylinderPlaced) {
                    placeOnce(
                        new THREE.Matrix4().fromArray(
                            pose.transform.matrix
                        )
                    );

                    cylinderPlaced = true;
                }
            }
        }
    }

    renderer.render(scene, camera);
}