const Role = require('../models/Role');

exports.getAllRoles = async (req, res) => {
  try {
    const roles = await Role.getAll();
    res.json(roles);
  } catch (error) {
    console.error('Error fetching roles:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des rôles' });
  }
};

exports.getRoleById = async (req, res) => {
  try {
    const role = await Role.getById(req.params.id);
    if (!role) {
      return res.status(404).json({ message: 'Rôle non trouvé' });
    }
    res.json(role);
  } catch (error) {
    console.error('Error fetching role:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération du rôle' });
  }
};

exports.createRole = async (req, res) => {
  try {
    const { name, description } = req.body;
    
    // Validation de base
    if (!name) {
      return res.status(400).json({ message: 'Le nom du rôle est requis' });
    }

    // Vérifier si le rôle existe déjà
    const existingRole = await Role.getByName(name);
    if (existingRole) {
      return res.status(409).json({ message: 'Un rôle avec ce nom existe déjà' });
    }

    const newRole = await Role.create({ name, description });
    res.status(201).json(newRole);
  } catch (error) {
    console.error('Error creating role:', error);
    res.status(500).json({ message: 'Erreur lors de la création du rôle' });
  }
};

exports.updateRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    // Validation de base
    if (!name) {
      return res.status(400).json({ message: 'Le nom du rôle est requis' });
    }

    // Vérifier si le rôle existe
    const existingRole = await Role.getById(id);
    if (!existingRole) {
      return res.status(404).json({ message: 'Rôle non trouvé' });
    }

    const updatedRole = await Role.update(id, { name, description });
    res.json(updatedRole);
  } catch (error) {
    console.error('Error updating role:', error);
    res.status(500).json({ message: 'Erreur lors de la mise à jour du rôle' });
  }
};

exports.deleteRole = async (req, res) => {
  try {
    const { id } = req.params;

    // Vérifier si le rôle existe
    const existingRole = await Role.getById(id);
    if (!existingRole) {
      return res.status(404).json({ message: 'Rôle non trouvé' });
    }

    // Vérifier si le rôle est utilisé par des utilisateurs
    // Cette logique devrait être implémentée dans le modèle ou un service séparé
    // const usersWithRole = await User.countByRoleId(id);
    // if (usersWithRole > 0) {
    //   return res.status(400).json({ message: 'Impossible de supprimer un rôle utilisé par des utilisateurs' });
    // }

    await Role.delete(id);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting role:', error);
    res.status(500).json({ message: 'Erreur lors de la suppression du rôle' });
  }
};