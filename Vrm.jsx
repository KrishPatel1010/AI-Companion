/*
Auto-generated by: https://github.com/pmndrs/gltfjsx
Command: npx gltfjsx@6.5.3 public/ImageToStl.com_8590256991748008892.vrm.glb 
*/

import React from 'react'
import { useGraph } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { SkeletonUtils } from 'three-stdlib'

export function Model(props) {
  const { scene } = useGLTF('/ImageToStl.com_8590256991748008892.vrm.glb')
  const clone = React.useMemo(() => SkeletonUtils.clone(scene), [scene])
  const { nodes, materials } = useGraph(clone)
  return (
    <group {...props} dispose={null}>
      <primitive object={nodes.Root} />
      <skinnedMesh geometry={nodes.Hair.geometry} material={materials['N00_000_Hair_00_HAIR_01 (Instance)']} skeleton={nodes.Hair.skeleton} />
      <skinnedMesh geometry={nodes['Body_(merged)baked'].geometry} material={materials['N00_000_00_Body_00_SKIN (Instance)']} skeleton={nodes['Body_(merged)baked'].skeleton} />
      <skinnedMesh geometry={nodes['Body_(merged)baked_1'].geometry} material={materials['N00_001_02_Bottoms_01_CLOTH (Instance)']} skeleton={nodes['Body_(merged)baked_1'].skeleton} />
      <skinnedMesh name="Face_(merged)baked" geometry={nodes['Face_(merged)baked'].geometry} material={materials['N00_000_00_FaceMouth_00_FACE (Instance)']} skeleton={nodes['Face_(merged)baked'].skeleton} morphTargetDictionary={nodes['Face_(merged)baked'].morphTargetDictionary} morphTargetInfluences={nodes['Face_(merged)baked'].morphTargetInfluences} />
      <skinnedMesh name="Face_(merged)baked_1" geometry={nodes['Face_(merged)baked_1'].geometry} material={materials['N00_000_00_EyeIris_00_EYE (Instance)']} skeleton={nodes['Face_(merged)baked_1'].skeleton} morphTargetDictionary={nodes['Face_(merged)baked_1'].morphTargetDictionary} morphTargetInfluences={nodes['Face_(merged)baked_1'].morphTargetInfluences} />
      <skinnedMesh name="Face_(merged)baked_2" geometry={nodes['Face_(merged)baked_2'].geometry} material={materials['N00_000_00_EyeHighlight_00_EYE (Instance)']} skeleton={nodes['Face_(merged)baked_2'].skeleton} morphTargetDictionary={nodes['Face_(merged)baked_2'].morphTargetDictionary} morphTargetInfluences={nodes['Face_(merged)baked_2'].morphTargetInfluences} />
      <skinnedMesh name="Face_(merged)baked_3" geometry={nodes['Face_(merged)baked_3'].geometry} material={materials['N00_000_00_Face_00_SKIN (Instance)']} skeleton={nodes['Face_(merged)baked_3'].skeleton} morphTargetDictionary={nodes['Face_(merged)baked_3'].morphTargetDictionary} morphTargetInfluences={nodes['Face_(merged)baked_3'].morphTargetInfluences} />
    </group>
  )
}

useGLTF.preload('/ImageToStl.com_8590256991748008892.vrm.glb')
