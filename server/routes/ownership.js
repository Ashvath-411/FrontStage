import { HttpError } from '../errors.js';

export async function findOwned(Model, id, userId) {
  const document = await Model.findById(id);
  if (!document) throw new HttpError(404, `${Model.modelName} not found`);
  if (String(document.ownerId) !== String(userId)) throw new HttpError(403, `This ${Model.modelName.toLowerCase()} belongs to someone else`);
  return document;
}
