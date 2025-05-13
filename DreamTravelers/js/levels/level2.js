class Level2 extends BaseLevel {
    constructor() {
        super();        
        this.grid = new Grid(this.scene);
        this.player = null;
        this.rotatingPlatforms = [];
        this.isRotating = false;
        this.playerPosition = { x: 0, y: 0, z: 0 };
        this.pathLine = null;
        this.sliderX = null;
        this.sliderY = null;
        this.sliderZ = null;
        
        this.scene.clearColor = new BABYLON.Color4(0.3, 0.4, 0.6, 1);

        this.fragments = [];
        this.requiredFragments = 3;
        this.collectedFragments = 0;
        
        // init level
        // this.createGridLines(this.grid.gridSize);
        this.spinningStars = this.createSpinningStars();
        
        // attacher la grille à la scène pour que les sliders puissent y accéder
        this.scene.level = this;
        
        this.player = new Player(this.scene, this.grid);
        this.scene.onReadyObservable.addOnce(() => {
            console.log("Scène prête, création du niveau...");
            this.createLevel();
            this.createSkyEnvironment();
        });
    }

    startLevel(levelId) {
        this.currentLevel = levelId;
    }

    createLevel() {
        // base principale
        const base = BABYLON.MeshBuilder.CreateBox(
            "base",
            { width: this.grid.gridSize, height: 1, depth: this.grid.gridSize },
            this.scene
        );
        base.position.y = -0.5;
        const baseMaterial = new BABYLON.StandardMaterial("baseMat", this.scene);
        baseMaterial.diffuseColor = new BABYLON.Color3(0.9, 0.9, 0.9);
        baseMaterial.alpha = 0.9;
        base.material = baseMaterial;

        // cubes
        this.grid.addGridElement(-2, 0, 0);
        this.grid.addGridElement(-1, 0, 0);
        this.grid.addGridElement(0, 0, 0);
        this.grid.addGridElement(1, 0, 0);
        //this.grid.addGridElement(2, 0, 0);
        
        this.grid.addGridElement(2, 0, 1);
        this.grid.addGridElement(-2, 0, 1);

        this.grid.addGridElement(2, 0, 2);
        this.grid.addGridElement(-2, 0, 2);

        // sliders
        this.sliderX = new Slider(
            this.scene, 
            new BABYLON.Vector3(-1, 0, -3), // position (x, y, z)
            'x',                          // axe de déplacement
            -4,                           // valeur minimale
            -1                             // valeur maximale
        );
        
        this.sliderY = new Slider(
            this.scene, 
            new BABYLON.Vector3(0, 8, 2),
            'y',
            0,
            8
        );

        this.sliderZ = new Slider(
            this.scene, 
            new BABYLON.Vector3(1, 6, -4),
            'z',
            -4,
            1
        );
        
        // cubes
        this.grid.addGridElement(-2, 0, 3);
        this.grid.addGridElement(2, 0, 3);
        
        // this.grid.addGridElement(-2, 0, 4);
        // this.grid.addGridElement(2, 0, 4);
        this.grid.addGridElement(-1, 0, 4);
        this.grid.addGridElement(0, 0, 4);
        this.grid.addGridElement(1, 0, 4);
        
        this.grid.addGridElement(0, 0, -1);
        this.grid.addGridElement(0, 0, -2);
        this.grid.addGridElement(0, 0, -3);
        this.grid.addGridElement(0, 0, -4);
        
        // escalier
        const stairs = new Stairs(this.scene, this.grid);
        stairs.create(-1, 1, 3, 1);

        this.grid.addGridElement(0, 1, 3);
        this.grid.addGridElement(1, 1, 3);

        stairs.create(1, 2, 2, 2);

        this.grid.addGridElement(1, 2, 1);

        stairs.create(0, 3, 1, 3);

        this.grid.addGridElement(-1, 3, 1);

        stairs.create(-1, 4, 2, 4);

        this.grid.addGridElement(-1, 4, 3);

        stairs.create(0, 5, 3, 1);

        this.grid.addGridElement(1, 5, 3);

        stairs.create(1, 6, 2, 2);
        
        this.grid.addGridElement(0, 6, 1);


        this.player.setPosition(0, 0, -4);

        // fragments à collecter à des positions différentes
        this.fragments.push(new Fragment(this.scene, this.grid, {x: -4, y: 0, z: -3}));
        this.fragments.push(new Fragment(this.scene, this.grid, {x: 0, y: 4, z: 2}));
        this.fragments.push(new Fragment(this.scene, this.grid, {x: 1, y: 6, z: -4}));
        
        // sortie
        this.exit = new Exit(this.scene, this.grid, {x: 0, y: 6, z: 1}, 3, this.requiredFragments);
    }

    createSkyEnvironment() {
        console.log("Création de l'environnement céleste...");
        
        // ciel lumineux
        this.scene.clearColor = new BABYLON.Color4(0.6, 0.8, 0.9, 1);
        
        // nuages autour de la plateforme
        this.createSurroundingClouds();
        
        this.scene.fogMode = BABYLON.Scene.FOGMODE_EXP;
        this.scene.fogDensity = 0.01;
        this.scene.fogColor = new BABYLON.Color3(0.9, 0.9, 1.0);
        
        // simuler le soleil
        // const sunLight = new BABYLON.DirectionalLight("sunLight", new BABYLON.Vector3(-1, -2, 1), this.scene);
        // sunLight.intensity = 1.2;
        // sunLight.diffuse = new BABYLON.Color3(1, 0.95, 0.8);
        
        console.log("Création de l'environnement céleste terminée.");
    }
    
    // creer les nuages
    createSurroundingClouds() {
        const cloudPositions = [
            { x: -15, y: -5, z: -15, scale: 3.0 },
            { x: -20, y: -7, z: 0, scale: 4.2 },
            { x: -15, y: -6, z: 15, scale: 3.5 },
            { x: 0, y: -8, z: 20, scale: 5.0 },
            { x: 15, y: -6, z: 15, scale: 3.7 },
            { x: 20, y: -7, z: 0, scale: 4.0 },
            { x: 15, y: -5, z: -15, scale: 3.2 },
            { x: 0, y: -6, z: -20, scale: 4.5 },
            { x: -10, y: -10, z: -10, scale: 6.0 },
            { x: 10, y: -9, z: 10, scale: 5.5 }
        ];
        
        // matériau
        const cloudMaterial = new BABYLON.StandardMaterial("cloudMat", this.scene);
        cloudMaterial.diffuseColor = new BABYLON.Color3(1, 1, 1);
        cloudMaterial.emissiveColor = new BABYLON.Color3(0.5, 0.5, 0.5);
        cloudMaterial.specularColor = new BABYLON.Color3(0, 0, 0);
        cloudMaterial.alpha = 0.85;
        
        // nuages volumétriques
        cloudPositions.forEach((pos, index) => {
            // groupe
            const cloudGroup = new BABYLON.TransformNode("largeCloudGroup" + index, this.scene);
            
            // nombre de parties
            const parts = Math.floor(Math.random() * 5) + 8;
            
            for (let i = 0; i < parts; i++) {
                // forme
                const cloudPart = BABYLON.MeshBuilder.CreateSphere(
                    "cloudPart" + index + "_" + i,
                    {
                        diameter: (0.8 + Math.random() * 1.5) * pos.scale,
                        segments: 8
                    },
                    this.scene
                );
                
                // position
                const offset = 1.5 * pos.scale;
                cloudPart.position = new BABYLON.Vector3(
                    pos.x + (Math.random() - 0.5) * offset,
                    pos.y + (Math.random() - 0.5) * (offset * 0.3),
                    pos.z + (Math.random() - 0.5) * offset
                );
                
                cloudPart.material = cloudMaterial.clone("cloudMat" + index + "_" + i);
                cloudPart.material.alpha = 0.7 + Math.random() * 0.2;
                
                cloudPart.parent = cloudGroup;
            }
            
            // animation
            const amplitude = 0.2 * pos.scale;
            const speed = 0.001 + Math.random() * 0.002;
            let time = Math.random() * 100;
            
            this.scene.registerBeforeRender(() => {
                time += speed;
                cloudGroup.position.y = Math.sin(time) * amplitude;
            });
        });
    }

    createSpinningStars() {
        // parent vide pour faire tourner toutes les étoiles
        const starsParent = new BABYLON.TransformNode("starsParent", this.scene);
        starsParent.position.y = 8;
        
        // 4 étoiles
        for (let i = 0; i < 4; i++) {
            // conteneur
            const starContainer = new BABYLON.TransformNode("starContainer", this.scene);
            starContainer.parent = starsParent;
            
            // positionner le conteneur en cercle
            const angle = (i * Math.PI * 2) / 4;
            starContainer.position = new BABYLON.Vector3(
                Math.cos(angle) * 12,
                0,
                Math.sin(angle) * 12
            );
            
            // créer une étoile
            const starMesh = BABYLON.MeshBuilder.CreatePolyhedron(
                "starMesh",
                { type: 2, size: 0.5 + Math.random() * 0.5 },
                this.scene
            );
            starMesh.parent = starContainer;
            
            // matériau
            const starMaterial = new BABYLON.StandardMaterial("starMaterial", this.scene);
            starMaterial.diffuseColor = new BABYLON.Color3(1, 1, 0.8);
            starMaterial.emissiveColor = new BABYLON.Color3(1, 1, 0.6);
            starMaterial.specularColor = new BABYLON.Color3(1, 1, 1);
            starMaterial.alpha = 0.9;
            
            // effet de brillance
            const glowLayer = new BABYLON.GlowLayer("starGlow", this.scene);
            glowLayer.intensity = 0.5;
            glowLayer.addIncludedOnlyMesh(starMesh);
            
            starMesh.material = starMaterial;
            
            // animation de rotation locale
            this.scene.registerBeforeRender(() => {
                starMesh.rotation.y += 0.01;
                starMesh.rotation.x += 0.005;
            });
            
            // petites étoiles
            for (let j = 0; j < 3; j++) {
                const smallStar = BABYLON.MeshBuilder.CreatePolyhedron(
                    "smallStar",
                    { type: 2, size: 0.15 + Math.random() * 0.1 },
                    this.scene
                );
                smallStar.parent = starContainer;
                
                // position
                smallStar.position = new BABYLON.Vector3(
                    (Math.random() - 0.5) * 1.5,
                    (Math.random() - 0.5) * 1.5,
                    (Math.random() - 0.5) * 1.5
                );

                // matériau
                const smallStarMat = new BABYLON.StandardMaterial("smallStarMat", this.scene);
                smallStarMat.diffuseColor = new BABYLON.Color3(1, 1, 0.9);
                smallStarMat.emissiveColor = new BABYLON.Color3(1, 1, 0.7);
                smallStarMat.alpha = 0.8;
                smallStar.material = smallStarMat;
                
                // animation de pulsation
                let pulse = 0;
                this.scene.registerBeforeRender(() => {
                    pulse += 0.03;
                    smallStar.scaling.x = smallStar.scaling.y = smallStar.scaling.z = 
                        0.9 + Math.sin(pulse) * 0.2;
                });
            }
        }
        
        // animation de rotation
        this.scene.registerBeforeRender(() => {
            starsParent.rotation.y += 0.001;
        });
        
        return starsParent;
    }
}