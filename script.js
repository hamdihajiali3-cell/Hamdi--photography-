import * as THREE from "three";

// ==========================================
// 1. FOOTER YEAR
// ==========================================

const yearNode = document.querySelector("#year");

if (yearNode) {
  yearNode.textContent = new Date().getFullYear();
}

// ==========================================
// 2. MOBILE NAVIGATION
// ==========================================

const menuButton = document.querySelector(".menu-toggle");
const nav = document.querySelector(".nav");

menuButton?.addEventListener("click", () => {
  const isOpen = nav.classList.toggle("open");

  menuButton.setAttribute("aria-expanded", String(isOpen));
  menuButton.setAttribute(
    "aria-label",
    isOpen ? "Close menu" : "Open menu"
  );

  menuButton.textContent = isOpen ? "×" : "☰";
});

nav?.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    nav.classList.remove("open");

    menuButton?.setAttribute("aria-expanded", "false");

    if (menuButton) {
      menuButton.textContent = "☰";
      menuButton.setAttribute("aria-label", "Open menu");
    }
  });
});

// ==========================================
// 3. 3D HOVER ON PHOTOGRAPHY GALLERY
// ==========================================

document.querySelectorAll("[data-tilt]").forEach((card) => {
  card.addEventListener("pointermove", (event) => {
    if (
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      window.innerWidth < 800
    ) {
      return;
    }

    const rect = card.getBoundingClientRect();

    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;

    card.style.transform =
      `perspective(900px) rotateY(${x * 3}deg) rotateX(${-y * 3}deg)`;
  });

  card.addEventListener("pointerleave", () => {
    card.style.transform = "";
  });
});

// ==========================================
// 4. CREATE THE THREE.JS SCENE
// ==========================================

const stage = document.querySelector("#three-stage");

if (stage) {
  try {
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(
      38,
      stage.clientWidth / stage.clientHeight,
      0.1,
      100
    );

    camera.position.set(0, 0, 8);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true
    });

    renderer.setPixelRatio(
      Math.min(window.devicePixelRatio || 1, 2)
    );

    renderer.setSize(stage.clientWidth, stage.clientHeight);

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;

    stage.appendChild(renderer.domElement);

    // ======================================
    // LIGHTING
    // ======================================

    scene.add(
      new THREE.AmbientLight(0xffffff, 1.5)
    );

    const goldLight = new THREE.PointLight(
      0xe5c17d,
      85,
      30
    );

    goldLight.position.set(3, 4, 5);
    scene.add(goldLight);

    const blueLight = new THREE.PointLight(
      0x7b8da5,
      55,
      25
    );

    blueLight.position.set(-4, -1, -3);
    scene.add(blueLight);

    // ======================================
    // MATERIALS
    // ======================================

    const blackMaterial = new THREE.MeshStandardMaterial({
      color: 0x171817,
      metalness: 0.8,
      roughness: 0.27
    });

    const metalMaterial = new THREE.MeshStandardMaterial({
      color: 0x5b5140,
      metalness: 0.85,
      roughness: 0.23
    });

    const goldMaterial = new THREE.MeshStandardMaterial({
      color: 0xc7a467,
      metalness: 0.78,
      roughness: 0.22
    });

    const glassMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x17212c,
      metalness: 0.6,
      roughness: 0.12,
      clearcoat: 1,
      clearcoatRoughness: 0.08
    });

    // ======================================
    // CAMERA BODY
    // ======================================

    const cameraGroup = new THREE.Group();

    scene.add(cameraGroup);

    const body = new THREE.Mesh(
      new THREE.BoxGeometry(3.35, 2.1, 1.15),
      blackMaterial
    );

    cameraGroup.add(body);

    const topPart = new THREE.Mesh(
      new THREE.BoxGeometry(1.15, 0.38, 0.8),
      metalMaterial
    );

    topPart.position.set(-0.45, 1.2, -0.02);

    cameraGroup.add(topPart);

    const grip = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 1.65, 0.95),
      blackMaterial
    );

    grip.position.set(1.42, -0.05, 0.02);

    cameraGroup.add(grip);

    // ======================================
    // CAMERA LENS
    // ======================================

    const lensGroup = new THREE.Group();

    lensGroup.position.set(-0.15, -0.02, 0.82);

    cameraGroup.add(lensGroup);

    const lensBarrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.83, 0.92, 0.72, 64),
      metalMaterial
    );

    lensBarrel.rotation.x = Math.PI / 2;

    lensGroup.add(lensBarrel);

    const frontBarrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.72, 0.78, 0.38, 64),
      blackMaterial
    );

    frontBarrel.rotation.x = Math.PI / 2;
    frontBarrel.position.z = 0.48;

    lensGroup.add(frontBarrel);

    const lensGlass = new THREE.Mesh(
      new THREE.CircleGeometry(0.64, 64),
      glassMaterial
    );

    lensGlass.position.z = 0.69;

    lensGroup.add(lensGlass);

    const lensRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.67, 0.035, 12, 64),
      goldMaterial
    );

    lensRing.position.z = 0.7;

    lensGroup.add(lensRing);

    // Reflection highlight on the glass.

    const glint = new THREE.Mesh(
      new THREE.CircleGeometry(0.14, 32),
      new THREE.MeshBasicMaterial({
        color: 0xd4bd8d,
        transparent: true,
        opacity: 0.75
      })
    );

    glint.position.set(-0.19, 0.22, 0.705);

    lensGroup.add(glint);

    // ======================================
    // CAMERA CONTROLS AND DETAILS
    // ======================================

    const dial = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.22, 0.12, 32),
      goldMaterial
    );

    dial.position.set(0.82, 1.13, 0.02);
    dial.rotation.z = Math.PI / 2;

    cameraGroup.add(dial);

    const button = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.1, 0.12, 24),
      metalMaterial
    );

    button.position.set(0.95, 1.16, 0.24);
    button.rotation.x = Math.PI / 2;

    cameraGroup.add(button);

    const badge = new THREE.Mesh(
      new THREE.BoxGeometry(0.48, 0.12, 0.035),
      goldMaterial
    );

    badge.position.set(-1.15, 0.66, 0.59);

    cameraGroup.add(badge);

    // ======================================
    // FLOATING ORBIT
    // ======================================

    const orbit = new THREE.Mesh(
      new THREE.TorusGeometry(2.55, 0.009, 8, 160),
      new THREE.MeshBasicMaterial({
        color: 0xc7a467,
        transparent: true,
        opacity: 0.5
      })
    );

    orbit.rotation.set(0.95, 0.35, 0.25);

    cameraGroup.add(orbit);

    // ======================================
    // MOUSE INTERACTION
    // ======================================

    cameraGroup.rotation.set(-0.12, -0.28, 0.04);

    let targetX = -0.12;
    let targetY = -0.28;

    stage.addEventListener("pointermove", (event) => {
      const rect = stage.getBoundingClientRect();

      targetY =
        -0.28 +
        ((event.clientX - rect.left) / rect.width - 0.5) * 0.55;

      targetX =
        -0.12 +
        ((event.clientY - rect.top) / rect.height - 0.5) * -0.3;
    });

    stage.addEventListener("pointerleave", () => {
      targetX = -0.12;
      targetY = -0.28;
    });

    // ======================================
    // ANIMATION LOOP
    // ======================================

    const clock = new THREE.Clock();

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    function animate() {
      requestAnimationFrame(animate);

      const time = clock.getElapsedTime();

      if (!reducedMotion) {
        cameraGroup.rotation.x +=
          (targetX - cameraGroup.rotation.x) * 0.035;

        cameraGroup.rotation.y +=
          (targetY - cameraGroup.rotation.y) * 0.035;

        cameraGroup.position.y = Math.sin(time * 0.7) * 0.09;

        orbit.rotation.z =
          0.25 + Math.sin(time * 0.18) * 0.12;
      }

      renderer.render(scene, camera);
    }

    animate();

    // ======================================
    // RESPONSIVE CANVAS
    // ======================================

    function resizeScene() {
      const width = stage.clientWidth;
      const height = stage.clientHeight;

      if (!width || !height) return;

      camera.aspect = width / height;

      camera.updateProjectionMatrix();

      renderer.setSize(width, height);
    }

    if ("ResizeObserver" in window) {
      new ResizeObserver(resizeScene).observe(stage);
    } else {
      window.addEventListener("resize", resizeScene);
    }

  } catch (error) {
    console.error("Unable to initialize the 3D camera:", error);
  }
}
