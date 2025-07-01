export function save(grid, name) {
  // 1) bundle name + grid into one object
  const data = {
    name: name || 'untitled',
    grid
  };
  const json = JSON.stringify(data, null, 2);

  // 2) create a filename based on the design name
  const safeName = (name || 'untitled').replace(/[^a-z0-9_\-]/gi, '_').toLowerCase();
  const filename = `${safeName}.json`;

  // 3) web download logic
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
export function load() {
    return new Promise((resolve, reject) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/json'
    input.style.display = 'none'
    input.onchange = () => {
      const file = input.files[0]
      if (!file) {
        reject(new Error('No file selected'))
        return
      }
      const reader = new FileReader()
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result)
          resolve(data)
        } catch (err) {
          reject(err)
        }
      }
      reader.onerror = () => reject(reader.error)
      reader.readAsText(file)
    }
    document.body.appendChild(input)
    input.click()
    // cleanup
    input.addEventListener('blur', () => {
      document.body.removeChild(input)
    })
  })
}