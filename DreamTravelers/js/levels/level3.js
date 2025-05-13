class Level3 extends BaseLevel {
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
        
        this.scene.clearColor = new BABYLON.Color4(0.05, 0.05, 0.1, 1);
        
        // fragments
        this.fragments = [];
        this.requiredFragments = 4;
        this.collectedFragments = 0;
        
        //this.createGridLines(this.grid.gridSize);
        
        this.player = new Player(this.scene, this.grid);
        
        this.scene.level = this;
        
        // ajouter les étoiles
        this.createDistantStars();
        
        this.scene.onReadyObservable.addOnce(() => {
            console.log("Scène prête, création du niveau...");
            this.createLevel();

            this.player.setPosition(0, 0, 0);
        });

    }

    startLevel(levelId) {
        this.currentLevel = levelId;
    }

    createLevel() {
        // structure
        // base circulaire
        for (let i = -3; i <= 3; i++) {
            for (let j = -3; j <= 3; j++) {
                // cercle (distance au centre ≤ 3)
                if (Math.sqrt(i*i + j*j) <= 3) {
                    this.grid.addGridElement(i, 0, j);
                }
            }
        }
        this.grid.removeGridElement(0, 0, 0);
        this.sliderY = new Slider(
            this.scene, 
            new BABYLON.Vector3(0, 0, 0), // position (x, y, z)
            'y',                          // axe de déplacement
            0,                           // valeur minimale
            4                             // valeur maximale
        );
        

        // piliers
        // Nord
        for (let y = 1; y <= 3; y++) {
            this.grid.addGridElement(0, y, -3);
        }
        // Sud 
        for (let y = 1; y <= 3; y++) {
            this.grid.addGridElement(0, y, 3);
        }
        // Est
        for (let y = 1; y <= 3; y++) {
            this.grid.addGridElement(3, y, 0);
        }
        // Ouest
        for (let y = 1; y <= 3; y++) {
            this.grid.addGridElement(-3, y, 0);
        }

        // Piliers des coins
        // Nord-Est
        for (let y = 1; y <= 3; y++) {
            this.grid.addGridElement(2, y, -2);
        }
        // Nord-Ouest
        for (let y = 1; y <= 3; y++) {
            this.grid.addGridElement(-2, y, -2);
        }
        // Sud-Est
        for (let y = 1; y <= 3; y++) {
            this.grid.addGridElement(2, y, 2);
        }
        // Sud-Ouest
        for (let y = 1; y <= 3; y++) {
            this.grid.addGridElement(-2, y, 2);
        }

        // toit circulaire
        for (let i = -3; i <= 3; i++) {
            for (let j = -3; j <= 3; j++) {
                if (Math.sqrt(i*i + j*j) <= 3) {
                    this.grid.addGridElement(i, 4, j);
                }
            }
        }
        this.grid.removeGridElement(0, 4, 0);

        // fragment 1
        this.sliderX = new Slider(
            this.scene, 
            new BABYLON.Vector3(15, 4, -3),
            'x',
            1,
            15
        );

        this.sliderY = new Slider(
            this.scene, 
            new BABYLON.Vector3(5, 15, -4),
            'y',
            0,
            15
        );

        // fragment 2
        this.sliderZ = new Slider(
            this.scene, 
            new BABYLON.Vector3(0, 4, -15),
            'z',
            -15,
            -4
        );

        const platform1 = new RotatingPlatform(this.scene, new BABYLON.Vector3(-2, 4, -15), 3, 1);
        this.rotatingPlatforms.push(platform1);

        this.sliderY = new Slider(
            this.scene, 
            new BABYLON.Vector3(-4, 4, -15),
            'y',
            0,
            4
        );

        this.sliderZ = new Slider(
            this.scene, 
            new BABYLON.Vector3(-5, 0, -18),
            'z',
            -20,
            -6
        );

        //fragment 3
        this.sliderZ = new Slider(
            this.scene, 
            new BABYLON.Vector3(5, 15, 14),
            'z',
            -3,
            14
        );

        this.sliderY = new Slider(
            this.scene, 
            new BABYLON.Vector3(4, 15, 14),
            'y',
            0,
            15
        );

        this.sliderZ = new Slider(
            this.scene, 
            new BABYLON.Vector3(5, 0, 20),
            'z',
            6,
            25
        );

        // fragment 4
        const platform2 = new RotatingPlatform(this.scene, new BABYLON.Vector3(5, 0, 27), 3, 0);
        this.rotatingPlatforms.push(platform2);
        
        const platform3 = new RotatingPlatform(this.scene, new BABYLON.Vector3(2, 0, 27), 3, 1);
        this.rotatingPlatforms.push(platform3);
        
        const platform4 = new RotatingPlatform(this.scene, new BABYLON.Vector3(2, 0, 30), 3, 0);
        this.rotatingPlatforms.push(platform4);

        this.sliderX = new Slider(
            this.scene, 
            new BABYLON.Vector3(0, 0, 30),
            'x',
            -4,
            0
        );

        this.sliderZ= new Slider(
            this.scene, 
            new BABYLON.Vector3(-5, 0, 30),
            'z',
            6,
            30
        );

        // escalier
        // const stairs = new Stairs(this.scene, this.grid);
        //stairs.create(1, 1, 1, 1);
        

        this.grid.addGridElement(-5, 0, -5);
        this.grid.addGridElement(5, 0, -5);
        this.grid.addGridElement(-5, 0, 5);
        this.grid.addGridElement(5, 0, 5);

        this.fragments.push(new Fragment(this.scene, this.grid, {x: -5, y: 0, z: -5}));
        this.fragments.push(new Fragment(this.scene, this.grid, {x: 5, y: 0, z: -5}));
        this.fragments.push(new Fragment(this.scene, this.grid, {x: -5, y: 0, z: 5}));
        this.fragments.push(new Fragment(this.scene, this.grid, {x: 5, y: 0, z: 5}));
        
        this.exit = new Exit(this.scene, this.grid, {x: 0, y: 4, z: 3}, 0, this.requiredFragments);
    }

    createDistantStars() {
        // nombre d'étoiles
        const numStars = 1500;
        
        // rayon
        const radius = 150;
        
        // matériaux
        const starMaterial = new BABYLON.StandardMaterial("starMaterial", this.scene);
        starMaterial.emissiveColor = new BABYLON.Color3(1, 1, 1);
        starMaterial.diffuseColor = new BABYLON.Color3(1, 1, 1);
        
        // ajouter une lueur pour augmenter l'intensité lumineuse
        const glowLayer = new BABYLON.GlowLayer("starGlow", this.scene);
        glowLayer.intensity = 1.0;
        
        // créer des étoiles à des positions aléatoires
        for (let i = 0; i < numStars; i++) {
            // créer une petite sphère pour chaque étoile, légèrement plus grande
            const star = BABYLON.MeshBuilder.CreateSphere(
                "star" + i, 
                { diameter: 0.3 }, 
                this.scene
            );
            
            // positionner l'étoile sur une sphère de rayon 'radius'
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.random() * Math.PI;
            
            star.position.x = radius * Math.sin(phi) * Math.cos(theta);
            star.position.y = radius * Math.cos(phi);
            star.position.z = radius * Math.sin(phi) * Math.sin(theta);
            
            // appliquer matériau
            star.material = starMaterial;
        }
    }
} 