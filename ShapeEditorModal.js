import React, { useState } from 'react';
import {
Modal,View,Text,TextInput,TouchableOpacity,StyleSheet,FlatList,
} from 'react-native';
import ColorPicker from './ColorPicker';

const GRID_DIM = 4; 

export default function ShapeEditorModal({ onClose, onSave }) {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#3498db');
  const [selectedCells, setSelectedCells] = useState(new Set());

  const toggleCell = (row, col) => {
    const key = `${row},${col}`;
    const newSet = new Set(selectedCells);
    if (newSet.has(key)) {
      newSet.delete(key);
    } else {
      newSet.add(key);
    }
    setSelectedCells(newSet);
  };


const handleSave = () => {
  if (!name.trim()) return; 
  if (selectedCells.size === 0) return; 

  const cellsArr = Array.from(selectedCells).map(str => {
    const [row, col] = str.split(',').map(Number);
    return { row, col };
  });

  const rows = cellsArr.map(c => c.row);
  const cols = cellsArr.map(c => c.col);
  const minRow = Math.min(...rows);
  const maxRow = Math.max(...rows);
  const minCol = Math.min(...cols);
  const maxCol = Math.max(...cols);

  const trimmedCells = cellsArr.map(({ row, col }) => ({
    row: row - minRow,
    col: col - minCol,
  }));

  onSave({
    id: `shape-${Date.now()}`,
    name: name.trim(),
    color,
    cells: trimmedCells,
  });
};

  const renderCell = (row, col) => {
    const key = `${row},${col}`;
    const selected = selectedCells.has(key);
    return (
      <TouchableOpacity
        key={key}
        onPress={() => toggleCell(row, col)}
        style={[
          styles.cell,
          { backgroundColor: selected ? color : '#eee', borderColor: selected ? '#000' : '#999' },
        ]}
      />
    );
  };
  const renderGrid = () => {
    const rows = [];
    for (let r = 0; r < GRID_DIM; r++) {
      const cols = [];
      for (let c = 0; c < GRID_DIM; c++) {
        cols.push(renderCell(r, c));
      }
      rows.push(
        <View key={`row-${r}`} style={styles.row}>
          {cols}
        </View>
      );
    }
    return rows;
  };

  return (
    <Modal visible transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalBox}>
          <Text style={styles.header}>Create New Shape</Text>
          <TextInput
            style={styles.input}
            placeholder="Shape name"
            value={name}
            onChangeText={setName}
          />

          <ColorPicker color={color} onColorChange={setColor} />
              
          <TextInput
            style={styles.input}
            placeholder="Color (e.g. #3498db)"
            value={color}
            onChangeText={setColor}
          />
          <Text style={{ marginBottom: 5 }}>Select shape cells:</Text>
          <View style={styles.gridContainer}>{renderGrid()}</View>

          <View style={styles.buttonsRow}>
            <TouchableOpacity style={styles.button} onPress={handleSave}>
              <Text style={styles.buttonText}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onClose}
            >
              <Text style={[styles.buttonText, styles.cancelButtonText]}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const CELL_SIZE = 40;

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: '#000000cc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBox: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    width: 320,
    borderColor: '#000',
    borderWidth: 2,
  },
  header: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#000',
    padding: 8,
    marginBottom: 10,
    borderRadius: 5,
  },
  gridContainer: {
    borderWidth: 1,
    borderColor: '#999',
    padding: 5,
    marginBottom: 15,
  },
  row: {
    flexDirection: 'row',
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    margin: 3,
    borderWidth: 1,
    borderRadius: 4,
  },
  buttonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  button: {
    backgroundColor: '#3498db',
    paddingVertical: 10,
    paddingHorizontal: 25,
    borderRadius: 6,
  },
  cancelButton: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  cancelButtonText: {
    color: '#333',
  },
});

