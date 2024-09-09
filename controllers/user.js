const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const {
  ValidateCreateUser,
  ValidateUpdateUser,
} = require("../validation/user");
const prisma = new PrismaClient();

function sanitizeUser(user) {
  const { password, students, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

async function getAllUsers(req, res) {
  try {
    const users = await prisma.users.findMany({
      include: {
        centre: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const sanitizedUsers = users.map(sanitizeUser);
    res.status(200).json(sanitizedUsers);
  } catch (error) {
    res.status(500).json({
      message:
        "Erreur lors de la récupération des utilisateurs: " + error.message,
    });
  }
}

async function getUserById(req, res) {
  const { id } = req.params;
  try {
    const user = await prisma.users.findUnique({
      where: { id: parseInt(id) },
      include: {
        centre: true,
        students: {
          select: {
            sex: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }
    if (user.isOwner) {
      const students = await prisma.students.findMany({ select: { sex:true } });
      const countSex = students.reduce(
        (acc, student) => {
          acc[student.sex] = (acc[student.sex] || 0) + 1;
          return acc;
        },
        { HOMME: 0, FEMME: 0 }
      );
      const sanitizedUser = sanitizeUser(user);
      return res.status(200).json({ ...sanitizedUser, countSex });
    } else {
      const countSex = user.students.reduce(
        (acc, student) => {
          acc[student.sex] = (acc[student.sex] || 0) + 1;
          return acc;
        },
        { HOMME: 0, FEMME: 0 }
      );
      const sanitizedUser = sanitizeUser(user);
      return res.status(200).json({ ...sanitizedUser, countSex });
    }
  } catch (error) {
    console.log(error)
    res.status(500).json({
      message:
        "Erreur lors de la récupération de l'utilisateur: " + error.message,
    });
  }
}

async function createUser(req, res) {
  const { firstName, lastName, email, password, phone, isOwner, centreId } =
    req.body;

  const { error } = ValidateCreateUser({
    firstName,
    lastName,
    email,
    password,
    phone,
    centreId,
  });
  if (error) {
    return res.status(400).json(error);
  }
  try {
    const existingUser = await prisma.users.findUnique({
      where: { email },
    });
    if (existingUser) {
      return res
        .status(400)
        .json({ message: "Un utilisateur avec cet email existe déjà" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.users.create({
      data: {
        firstName,
        lastName,
        email,
        password: hashedPassword,
        phone,
        isOwner,
        centre: centreId ? { connect: { id: centreId } } : undefined,
      },
      include: {
        centre: {
          include: {
            students: {
              include: {
                level: true,
                subjects: true,
                payments: true,
              },
            },
            user: true,
          },
        },
        students: {
          include: {
            level: true,
            subjects: true,
            payments: true,
          },
        },
      },
    });

    const sanitizedUser = sanitizeUser(user);
    res
      .status(201)
      .json({ message: "Utilisateur créé avec succès", user: sanitizedUser });
  } catch (error) {
    res.status(500).json({
      message: "Erreur lors de la création de l'utilisateur: " + error.message,
    });
  }
}

async function updateUser(req, res) {
  const { id } = req.params;
  const { firstName, lastName, email, password, phone, isOwner, centreId } =
    req.body;

  const { error } = ValidateUpdateUser({
    firstName,
    lastName,
    email,
    password,
    phone,
    centreId,
  });
  if (error) {
    return res.status(400).json(error);
  }
  try {
    const existingUser = await prisma.users.findUnique({
      where: { id: parseInt(id) },
    });
    if (!existingUser) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }

    if (email && email !== existingUser.email) {
      const emailExists = await prisma.users.findUnique({
        where: { email },
      });
      if (emailExists) {
        return res
          .status(400)
          .json({ message: "Un autre utilisateur avec cet email existe déjà" });
      }
    }

    const updatedData = {
      firstName,
      lastName,
      email,
      phone,
      isOwner,
      centre: centreId ? { connect: { id: centreId } } : { disconnect: true },
    };

    if (password) {
      updatedData.password = await bcrypt.hash(password, 10);
    }

    const user = await prisma.users.update({
      where: { id: parseInt(id) },
      data: updatedData,
      include: {
        centre: {
          select: {
            name: true,
          },
        },
      },
    });

    const sanitizedUser = sanitizeUser(user);
    res.status(200).json({
      message: "Utilisateur mis à jour avec succès",
      user: sanitizedUser,
    });
  } catch (error) {
    res.status(500).json({
      message:
        "Erreur lors de la mise à jour de l'utilisateur: " + error.message,
    });
  }
}

async function deleteUser(req, res) {
  const { id } = req.params;
  try {
    const existingUser = await prisma.users.findUnique({
      where: { id: parseInt(id) },
    });
    if (!existingUser) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }

    await prisma.users.delete({
      where: { id: parseInt(id) },
    });
    res.status(200).json({ message: "Utilisateur supprimé avec succès" });
  } catch (error) {
    res.status(500).json({
      message:
        "Erreur lors de la suppression de l'utilisateur: " + error.message,
    });
  }
}

module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
};
