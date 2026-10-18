const departments = [
  'Engineering', 'People Operations', 'Finance', 'Customer Success', 'Product',
];
const firstNames = [
  'Avery', 'Jordan', 'Riley', 'Casey', 'Morgan', 'Taylor', 'Cameron', 'Quinn',
  'Drew', 'Skyler', 'Reese', 'Rowan',
];
const lastNames = ['Bennett', 'Chen', 'Patel', 'Rivera', 'Thompson'];

const employees = Array.from({ length: firstNames.length * lastNames.length }, (_unused, index) => {
  const departmentIndex = index % departments.length;
  const firstName = firstNames[Math.floor(index / lastNames.length)];
  const lastName = lastNames[index % lastNames.length];
  const number = String(index + 1).padStart(2, '0');
  return {
    firstName,
    lastName,
    email: `seed.employee.${number}@fictional.example`,
    department: departments[departmentIndex],
    managerEmail: index < departments.length
      ? null
      : `seed.employee.${String(departmentIndex + 1).padStart(2, '0')}@fictional.example`,
    joiningDate: `202${2 + (index % 4)}-${String((index % 12) + 1).padStart(2, '0')}-${String((index % 27) + 1).padStart(2, '0')}`,
  };
});

export { departments, employees };
