// utils/formatCustomer.js

function formatCustomer(customer) {
  return {
    _id: customer._id,
    name: customer.name,
    email: customer.email,
    createdAt: customer.createdAt,
    updatedAt: customer.updatedAt,
  };
}

module.exports = formatCustomer;
