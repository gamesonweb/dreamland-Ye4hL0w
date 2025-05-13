class Clouds {
    constructor(scene) {
        this.scene = scene;
        this.cloudsParent = null;
        this.create();
    }
    
    create() {
        // parent vide pour tous les nuages
        const cloudsParent = new BABYLON.TransformNode("cloudsParent", this.scene);
        cloudsParent.position.y = 10;

        // création de 4 nuages
        for (let i = 0; i < 4; i++) {
            const cloudContainer = new BABYLON.TransformNode("cloudContainer", this.scene);
            cloudContainer.parent = cloudsParent;
            
            // position en cercle
            const angle = (i * Math.PI * 2) / 4;
            cloudContainer.position = new BABYLON.Vector3(
                Math.cos(angle) * 8, // rayon de 8
                0,
                Math.sin(angle) * 8
            );

            // parties du nuage
            const parts = Math.random() * 2 + 3;
            for (let j = 0; j < parts; j++) {
                const cloudPart = BABYLON.MeshBuilder.CreatePolyhedron(
                    "cloudPart",
                    { type: 1, size: 0.5 + Math.random() },
                    this.scene
                );
                cloudPart.parent = cloudContainer;
                
                // position aléatoire
                cloudPart.position = new BABYLON.Vector3(
                    (Math.random() - 0.5) * 2,
                    (Math.random() - 0.5),
                    (Math.random() - 0.5) * 2
                );
                
                // rotation aléatoire
                cloudPart.rotation = new BABYLON.Vector3(
                    Math.random() * Math.PI,
                    Math.random() * Math.PI,
                    Math.random() * Math.PI
                );

                // matériau
                const cloudMaterial = new BABYLON.StandardMaterial("whiteCloud", this.scene);
                cloudMaterial.diffuseColor = new BABYLON.Color3(1, 1, 1);
                cloudMaterial.alpha = 0.8;
                cloudMaterial.specularColor = new BABYLON.Color3(0, 0, 0);
                cloudPart.material = cloudMaterial;
            }
        }

        // rotation
        this.scene.registerBeforeRender(() => {
            cloudsParent.rotation.y += 0.002;
        });
    }
}