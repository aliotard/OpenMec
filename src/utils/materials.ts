export const getPartMaterial = (color: string, isSelected?: boolean) => ({
    color: isSelected ? '#ff9f43' : color,
    metalness: 0.8,
    roughness: 0.3,
    emissive: isSelected ? '#442200' : '#000000'
});
