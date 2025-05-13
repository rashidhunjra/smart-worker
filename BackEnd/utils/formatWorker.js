// utils/formatWorker.js
function formatWorker(worker) {
  return {
    _id: worker._id,
    name: worker.name,
    email: worker.email,
    createdAt: worker.createdAt,
    updatedAt: worker.updatedAt,
  };
}

module.exports = formatWorker;
