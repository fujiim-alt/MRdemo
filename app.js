import * as THREE from "https://unpkg.com/three@0.166.1/build/three.module.js";
import { ARButton } from "https://unpkg.com/three@0.166.1/examples/jsm/webxr/ARButton.js";

let scene, camera, renderer;

let hitTestSource = null;
let hitTestSourceRequested = false;

let currentHitMatrix = null;
let arStarted = false;

let reticle;

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

    // レティクル（地面認識可視化）
    const geo = new THREE.RingGeometry(0.2, 0.25, 32);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    reticle = new THREE.Mesh(geo, mat);
    reticle.rotation.x = -Math.PI / 2;
    reticle.visible = false;
    scene.add(reticle);

    window.addEventListener("click", startAROnce);

    renderer.setAnimationLoop(render);
}

function startAROnce() {

    if (arStarted) return;
    arStarted = true;

    document.getElementById("hint").style.display = "none";

    document.body.appendChild(
        ARButton.createButton(renderer, {
            requiredFeatures: ["hit-test"]
        })
    );

    // ARセッション開始後に入力登録
    renderer.xr.addEventListener("sessionstart", () => {

        const session = renderer.xr.getSession();

        session.addEventListener("select", onSelect);
    });
}

function onSelect() {

    if (!currentHitMatrix) return;

    const geo = new THREE.CylinderGeometry(5, 5, 20, 32);

    const mat = new THREE.MeshStandardMaterial({
        color: 0x00ff00,
        transparent: true,
        opacity: 0.4
    });

    const cylinder = new THREE.Mesh(geo, mat);

    cylinder.position.setFromMatrixPosition(currentHitMatrix);
    cylinder.position.y += 10;

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

                currentHitMatrix = new THREE.Matrix4().fromArray(
                    pose.transform.matrix
                );

                reticle.visible = true;
                reticle.matrix.fromArray(pose.transform.matrix);
                reticle.matrix.decompose(
                    reticle.position,
                    reticle.quaternion,
                    reticle.scale
                );

            } else {
                reticle.visible = false;
            }
        }
    }

    renderer.render(scene, camera);
}