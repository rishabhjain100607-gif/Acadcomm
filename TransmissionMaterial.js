import * as THREE from 'three'

export class TransmissionMaterial {
  constructor(params) {
    this.params = params
    this.materials = new Set()
  }

  createMesh(geometry) {
    const material = new THREE.MeshPhysicalMaterial()
    this.materials.add(material)
    this.#apply(material)
    return new THREE.Mesh(geometry, material)
  }

  update() {
    for (const material of this.materials) {
      this.#apply(material)
      material.needsUpdate = true
    }
  }

  #apply(material) {
    const params = this.params
    material.color = new THREE.Color(params.color)
    material.metalness = 0
    material.roughness = params.roughness
    material.transmission = params.transmission
    material.thickness = params.thickness
    material.ior = params.ior
    material.attenuationColor = new THREE.Color(params.attenuationColor)
    material.attenuationDistance = params.attenuationDistance
    material.envMapIntensity = params.envMapIntensity
    material.iridescence = params.iridescence
    material.iridescenceIOR = params.iridescenceIOR
    material.iridescenceThicknessRange = [params.iridescenceThicknessMin, params.iridescenceThicknessMax]
    material.clearcoat = params.clearcoat
    material.clearcoatRoughness = params.clearcoatRoughness
    material.specularIntensity = params.specularIntensity
    material.specularColor = new THREE.Color(params.specularColor)
    material.transparent = true
    material.opacity = 1
  }
}
