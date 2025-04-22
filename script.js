window.addEventListener('DOMContentLoaded', () => {
    const container = document.querySelector('#scene-container');
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xd9d9d9);

    const camera = new THREE.PerspectiveCamera(
        75,
        container.clientWidth / container.clientHeight,
        0.1,
        1000
    );
    camera.position.set(0, 0, 2);
    
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.physicallyCorrectLights = true;
    renderer.outputEncoding = THREE.sRGBEncoding;
    container.appendChild(renderer.domElement);

    // Controles
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.03;
    controls.minDistance = 0.6;
    controls.maxDistance = 1;
    controls.mouseButtons = {
        LEFT: THREE.MOUSE.ROTATE,
        MIDDLE: null,
        RIGHT: null
    };

    let fbxModel = null;
    let textMesh = null;
    let textMesh2 = null;

    // Debug: Ejes y luces
    const axesHelper = new THREE.AxesHelper(5);
    scene.add(axesHelper);

    const ambientLight = new THREE.AmbientLight(0xffffff, 2.0); // Aumenta intensidad
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 3.0); // Aumenta intensidad
    dirLight.position.set(5, 10, 5);
    scene.add(dirLight)
    renderer.shadowMap.enabled = true;

    // 🔄 Carga de texturas con manejo de errores
    const textureLoader = new THREE.TextureLoader();
    const loadTexture = (path) => {
        return new Promise((resolve, reject) => {
            textureLoader.load(
                path,
                (texture) => resolve(texture),
                undefined,
                (error) => {
                    console.error(`Error al cargar textura: ${path}`, error);
                    resolve(null); // Devuelve null si falla
                }
            );
        });
    };
    
    // Configuración inicial
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let model; // Variable para almacenar el modelo

    // Cargador GLB
    const loader = new THREE.GLTFLoader();

    loader.load('./models/Maleta.glb', (gltf) => {
    model = gltf.scene;
    scene.add(model);

    // Material INVISIBLE (100% transparente)
    const invisibleMaterial = new THREE.MeshBasicMaterial({
        color: 0x000000,  // El color no importa (totalmente transparente)
        transparent: true,
        opacity: 0,        // Opacidad CERO
        depthWrite: false  // Evita artefactos visuales
    });

    // Aplicar a ambas partes
    model.traverse((child) => {
        if (child.isMesh && (child.name === "P_Back_GEO" || child.name === "P_handle_GEO")) {
            child.material = invisibleMaterial;
            console.log(`✅ ${child.name}: Ahora es completamente invisible`);
        }
    });

    // Ajustes del modelo
    model.scale.set(10, 10, 10);
    model.position.set(0, -0.15, 0);

    }, undefined, (error) => {
        console.error("❌ Error al cargar:", error);
    });
    
    // Animación y resto del código (sin cambios)
    function animate() {
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
    }
    animate();

    window.addEventListener('resize', () => {
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    });

    // 🔳 Vista previa del color
    const previewBox = document.createElement('div');
    previewBox.style.position = 'absolute';
    previewBox.style.width = '60px';
    previewBox.style.height = '60px';
    previewBox.style.border = '2px solid #333';
    previewBox.style.display = 'none';
    previewBox.style.zIndex = '1000';
    previewBox.style.pointerEvents = 'none';
    document.body.appendChild(previewBox);

    // 🎨 Interacción con los círculos de color
    document.querySelectorAll('.color-circle').forEach(circle => {
        const color = circle.getAttribute('data-color');

        circle.addEventListener('mouseover', () => {
            previewBox.style.background = color;
            previewBox.style.display = 'block';
        });

        circle.addEventListener('mousemove', (e) => {
            previewBox.style.left = `${e.pageX + 10}px`;
            previewBox.style.top = `${e.pageY + 10}px`;
        });

        circle.addEventListener('mouseleave', () => {
            previewBox.style.display = 'none';
        });

        circle.addEventListener('click', () => {
            if (textMesh && textMesh.material) {
                textMesh.material.color.set(color);
            }
            if (textMesh2 && textMesh2.material) {
                textMesh2.material.color.set(color);
            }
        });
    });

    let viewSelected = false; // Controla si se ha seleccionado una vista
    let currentView = null;   // 'back' o 'top'
    
    // 📝 Añadir texto personalizado en el modelo
    document.getElementById('applyTextBtn').addEventListener('click', () => {
        // Validación de vista seleccionada
        if (!viewSelected) {
            alert("Selecciona primero una vista con los botones Back o Top");
            return;
        }
        
        const input = document.getElementById('customTextInput').value.trim();
        if (input === "") return;
        
        if (input.length > 6) {
            alert("Máximo 6 letras.");
            return;
        }
        
        const fontLoader = new THREE.FontLoader();
        fontLoader.load('./fonts/PORN_FASHION_TRIAL.json', function (font) {
            // Limpieza selectiva
            if (currentView === 'back' && textMesh) {
                scene.remove(textMesh);
                textMesh.geometry.dispose();
                textMesh.material.dispose();
            }
            
            if (currentView === 'top' && textMesh2) {
                scene.remove(textMesh2);
                textMesh2.geometry.dispose();
                textMesh2.material.dispose();
            }
            
            // Generación condicional
            if (currentView === 'back') {
                textMesh = createBackText(font, input);
                scene.add(textMesh);
            } 
            else if (currentView === 'top') {
                textMesh2 = createTopText(font, input);
                scene.add(textMesh2);
            }
        });
    });
    
    // Funciones auxiliares (opcional, para mejor organización)
    function createBackText(font, text) {
        const geometry = new THREE.TextGeometry(text, {
            font: font,
            size: 0.037,
            height: 0.01
        });
        geometry.center();
        
        const mesh = new THREE.Mesh(
            geometry,
            new THREE.MeshBasicMaterial({ color: 0x000000 })
        );
        
        mesh.position.set(0, 0.001, -0.14);
        mesh.rotation.set(Math.PI, 0, Math.PI);
        return mesh;
    }
    
    function createTopText(font, text) {
        const textGeometry = new THREE.TextGeometry(text, {
            font: font,
            size: 0.02,
            height: 0.001,
            curveSegments: 24  // Más segmentos = curva más suave
        });
        textGeometry.center();
    
        // 1. Obtener los vértices originales
        const positions = textGeometry.attributes.position.array;
        const curvedPositions = new Float32Array(positions.length);
    
        // 2. Parámetros de la curva "U" en Z
        const curveIntensity = -1;  // Ajusta la profundidad de la "U"
        const curveWidth = 0.5;      // Ajusta el ancho de la "U"
    
        // 3. Aplicar deformación en el eje Z
        for (let i = 0; i < positions.length; i += 3) {
            const x = positions[i];
            const y = positions[i + 1];
            const z = positions[i + 2];
    
            // Normalizar X entre [-1, 1] para la curva
            const normalizedX = (x / curveWidth);
    
            // Fórmula de "U" aplicada a Z (en lugar de Y)
            const curvedZ = z + (normalizedX * normalizedX) * curveIntensity;
    
            // Mantener X e Y sin cambios
            curvedPositions[i] = x;
            curvedPositions[i + 1] = y;
            curvedPositions[i + 2] = curvedZ;  // ¡Deformación en Z!
        }
    
        // Reemplazar la geometría original
        textGeometry.setAttribute('position', new THREE.BufferAttribute(curvedPositions, 3));
        textGeometry.computeVertexNormals();  // Para iluminación correcta
    
        const mesh = new THREE.Mesh(
            textGeometry,
            new THREE.MeshBasicMaterial({ color: 0x000000 })
        );
    
        // 🔥 Mantener posición y rotación original (¡NO CAMBIAR!)
        mesh.position.set(-0.06, 0.363, -0.055);
        mesh.rotation.set(Math.PI / -2, -0.4, 3.15);
    
        return mesh;
    }
    

    // Limitar el input a máximo 6 caracteres en tiempo real
    const inputField = document.getElementById('customTextInput');
    inputField.addEventListener('input', () => {
        if (inputField.value.length > 6) {
            inputField.value = inputField.value.slice(0, 6);
        }
    });


    // Sistema de estrellas (valoración)
    const stars = document.querySelectorAll('.star');
    stars.forEach(star => {
        star.addEventListener('click', () => {
            const value = parseInt(star.getAttribute('data-value'));
            stars.forEach(s => {
                const starValue = parseInt(s.getAttribute('data-value'));
                s.classList.toggle('highlighted', starValue <= value);
            });
        });
    });

    // Mostrar u ocultar el panel de personalización
    customizeToggleBtn.addEventListener('click', () => {
    customizePanel.style.display = customizePanel.style.display === 'block' ? 'none' : 'block';
    });

    // Botones de vista personalizada
    const backViewBtn = document.getElementById('backViewBtn');
    const topViewBtn = document.getElementById('topViewBtn');

    backViewBtn.addEventListener('click', () => {
        currentView = 'back';
        viewSelected = true; 
        gsap.to(camera.position, {
            duration: 1,
            x: 0,
            y: 0,
            z: -0.1,
            onUpdate: () => camera.lookAt(0, 0, 0),
            onComplete: () => {
                if (textMesh) textMesh.visible = true;
                if (textMesh2) textMesh2.visible = false;
            }
        });
    });
    
    topViewBtn.addEventListener('click', () => {
        currentView = 'top';
        viewSelected = true; 
        gsap.to(camera.position, {
            duration: 1,
            x: -0.14,
            y: 0.5,
            z: -0.05,
            onUpdate: () => camera.lookAt(0, 0, 0),
            onComplete: () => {
                if (textMesh) textMesh.visible = false;
                if (textMesh2) textMesh2.visible = true;
            }
        });
    });
})









