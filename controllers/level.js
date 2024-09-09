const { PrismaClient } = require('@prisma/client');
const { ValidateCreateLevel } = require('../validation/level');
const prisma = new PrismaClient();

// Create a Level
async function createLevel(req, res) {
  const { name ,type} = req.body;
  const { error } = ValidateCreateLevel({ name ,type });
  if (error) {
    return res.status(400).json(error);
  }
  try {
    const existingLevel = await prisma.levels.findUnique({
      where: { name },
    });

    if (existingLevel) {
      return res.status(400).json({ message: 'Le niveau existe déjà' });
    }

    const newLevel = await prisma.levels.create({
      data: { name,type },
      include:{ students: true}
    });

    res.status(201).json({ message: 'Niveau créé avec succès', level: newLevel });
  } catch (error) {
    console.log(error.message)
    res.status(500).json({ message: 'Erreur lors de la création du niveau: ' + error.message });
  }
}

// Get All Levels
async function getAllLevels(req, res) {
  try {
    const levels = await prisma.levels.findMany({
      include: { students: true }, orderBy:{
        createdAt:"desc"
      } // Include students for each level
    });

    res.status(200).json(levels);
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la récupération des niveaux: ' + error.message });
  }
}

// Get Level by ID
async function getLevelById(req, res) {
  const { id } = req.params;
  try {
    const level = await prisma.levels.findUnique({
      where: { id: parseInt(id) },
      include: { students: true },  // Include students for the level
    });

    if (!level) {
      return res.status(404).json({ message: 'Niveau non trouvé' });
    }

    res.status(200).json(level);
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la récupération du niveau: ' + error.message });
  }
}
async function getLevelBySchool(req, res) {
  const { school } = req.params;
  try {
    const levels = await prisma.levels.findMany({
      where: { type:school },
      select:{
        id:true ,
        name:true ,
        type:true
      },
      orderBy:{
        createdAt:'desc'
      }
    });
    res.status(200).json(levels);
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la récupération du niveau: ' + error.message });
  }
}

// Update Level
async function updateLevel(req, res) {
  const { id } = req.params;
  const { name,type } = req.body;
  try {
    const updatedLevel = await prisma.levels.update({
      where: { id: parseInt(id) },
      data: { name,type },
      include:{ students: true}
    });

    res.status(200).json({ message: 'Niveau mis à jour avec succès', level: updatedLevel });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la mise à jour du niveau: ' + error.message });
  }
}

// Delete Level
async function deleteLevel(req, res) {
  const { id } = req.params;
  try {
    await prisma.levels.delete({
      where: { id: parseInt(id) },
    });

    res.status(200).json({ message: 'Niveau supprimé avec succès' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la suppression du niveau: ' + error.message });
  }
}

module.exports = {
  createLevel,
  getAllLevels,
  getLevelById,
  updateLevel,
  deleteLevel,
  getLevelBySchool
};
