class Level1 extends BaseLevel {
    constructor() {
        super();
        this.grid = new Grid(this.scene);
        this.player = null;
        this.rotatingPlatforms = [];
        this.isRotating = false;
        this.playerPosition = { x: 0, y: 0, z: 0 };
        this.pathLine = null;
        
        this.fragments = [];
        this.requiredFragments = 3;
        this.collectedFragments = 0;
        
        //this.createGridLines(this.grid.gridSize);
        this.spinningClouds = new Clouds(this.scene);
        this.player = new Player(this.scene, this.grid);
        
        this.createLevel();
        this.createWaterEffect();
        
        window.addEventListener("keydown", (evt) => this.handleKeyboard(evt));
        
        this.scene.level = this;
        
        // Initialiser le modèle après la création du niveau
        this.initializeModel();
    }
    
    async initializeModel() {
        await this.loadModel();
    }

    startLevel(levelId) {
        this.currentLevel = levelId;
    }

    handleKeyboard(evt) {
    }

    async loadModel() {
        try {
            const result = await BABYLON.SceneLoader.ImportMeshAsync("", "models/level1/", "minecraft_boat.glb", this.scene);
            
            const boatModel = result.meshes[0];
            
            boatModel.scaling = new BABYLON.Vector3(15, 15, 15);
            boatModel.position = new BABYLON.Vector3(0, -3, -2);
            boatModel.rotation = new BABYLON.Vector3(0, Math.PI / 2, 0);
            
            boatModel.checkCollisions = true;
            boatModel.isPickable = true;
            
            this.islandModel = boatModel;
            console.log("Boat model loaded at position:", boatModel.position);
        } catch (error) {
            console.error("Error loading boat model:", error);
        }
    }

    createLevel() {
        // base principale
        const base = BABYLON.MeshBuilder.CreateBox(
            "base",
            { width: 10, height: 1, depth: 14.6 },
            this.scene
        );
        base.position.y = -0.5;
        base.position.x = -0.5;
        base.position.z = -0.55;
        const baseMaterial = new BABYLON.StandardMaterial("baseMat", this.scene);
        baseMaterial.diffuseColor = new BABYLON.Color3(101/255, 67/255, 33/255);
        // baseMaterial.alpha = 0.5;
        base.material = baseMaterial;

        // cubes
        this.grid.addGridElement(2, 0, 0);
        this.grid.addGridElement(1, 0, 0);
        this.grid.addGridElement(0, 0, 0);
        this.grid.addGridElement(-1, 0, 0);
        this.grid.addGridElement(-2, 0, 0);
        this.grid.addGridElement(0, 1, 3);
        this.grid.addGridElement(1, 1, 3);
        this.grid.addGridElement(-1, 1, 3);
        this.grid.addGridElement(-2, 1, 3);
        this.grid.addGridElement(2, 0, 3);
        this.grid.addGridElement(2, 1, 3);
        this.grid.addGridElement(2, 2, 3);
        this.grid.addGridElement(0, 0, -4);
        this.grid.addGridElement(-4, 0, -4);
        this.grid.addGridElement(0, 1, 2);

        // cube isolé
        this.grid.addGridElement(-2, 0, -2);
        
        // escalier
        const stairs = new Stairs(this.scene, this.grid);
        stairs.create(0, 1, 1, 0);
        stairs.create(1, 2, 3, 1);

        // plateforme rotative
        const platform1 = new RotatingPlatform(this.scene, new BABYLON.Vector3(0, 0, -2), 3, 0);
        this.rotatingPlatforms.push(platform1);
        
        // plateforme rotative
        const platform2 = new RotatingPlatform(this.scene, new BABYLON.Vector3(-2, 0, -4), 3, 1);
        this.rotatingPlatforms.push(platform2);

        if (this.player && this.player.mesh) {
            // vérif que le joueur n'est pas attaché à une plateforme au démarrage
            this.player.mesh.parent = null;
            this.player.setPosition(0, 0, 0);
            
            setTimeout(() => {
                // vérification de la position
                if (this.player.mesh && this.player.mesh.parent) {
                    const worldPos = this.player.mesh.getAbsolutePosition();
                    this.player.mesh.parent = null;
                    this.player.mesh.position = worldPos;
                    this.player.mesh.position.x = 0;
                    this.player.mesh.position.z = 0;
                    this.player.position = { x: 0, y: 0, z: 0 };
                    console.log("Position du joueur corrigée:", this.player.mesh.position);
                }
            }, 100);
        }
        
        // fragments à collecter
        this.fragments.push(new Fragment(this.scene, this.grid, {x: -2, y: 0, z: -2}));
        this.fragments.push(new Fragment(this.scene, this.grid, {x: 2, y: 2, z: 3}));
        this.fragments.push(new Fragment(this.scene, this.grid, {x: 0, y: 0, z: -4}));
        
        // sortie
        this.exit = new Exit(this.scene, this.grid, {x: -4, y: 0, z: -4}, 2, this.requiredFragments);
    }

    createWaterEffect() {
        // plan d'eau
        const waterMesh = BABYLON.MeshBuilder.CreateGround("waterMesh", { width: 1600, height: 1600 }, this.scene);
        waterMesh.position = new BABYLON.Vector3(0, -1, 0);
        
        const waterMaterial = new BABYLON.StandardMaterial("waterMaterial", this.scene);
        const waterTexture = new BABYLON.Texture("assets/textures/waterbump.jpg", this.scene);
        waterTexture.uScale = 64;
        waterTexture.vScale = 64;
        waterMaterial.diffuseTexture = waterTexture;
        waterMaterial.alpha = 0.8;
        waterMaterial.specularColor = new BABYLON.Color3(0.2, 0.2, 0.2);
        waterMaterial.emissiveColor = new BABYLON.Color3(0.1, 0.3, 0.5);
        
        waterMesh.material = waterMaterial;
        
        // brouillard
        // this.scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
        // this.scene.fogColor = new BABYLON.Color3(0.1, 0.3, 0.5);
        // this.scene.fogDensity = 0.01;
        
        // lumière ambiante
        const ambientLight = new BABYLON.HemisphericLight("ambientLight", new BABYLON.Vector3(0, 1, 0), this.scene);
        ambientLight.intensity = 0.5;
        ambientLight.groundColor = new BABYLON.Color3(0.1, 0.3, 0.5);
        ambientLight.diffuse = new BABYLON.Color3(0.7, 0.8, 1);
    }
}