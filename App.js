import React, { useState, useRef } from 'react';
import {View, Text, TouchableOpacity, Modal, TextInput, StyleSheet, Dimensions, ScrollView, Linking, PanResponder, Platform, Pressable,} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5'
import ShapeEditorModal from './ShapeEditorModal'; 
import { save, load } from './save';
document.addEventListener('contextmenu', event => event.preventDefault());
//beta rotation
const rotateShape = (shape) => {
  const newCells = shape.cells.map(({ row, col }) => ({ row: col, col: -row }));
  const minRow = Math.min(...newCells.map(c => c.row));
  const minCol = Math.min(...newCells.map(c => c.col));
  const normalized = newCells.map(({ row, col }) => ({
    row: row - minRow,
    col: col - minCol,
  }));
  return { ...shape, cells: normalized };
};

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;
const GRID_WIDTH = 550;

const defaultShapes = [
  {
    id: 'square2x2',
    name: '2x2 Table',
    cells: [
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 1, col: 0 },
      { row: 1, col: 1 },
    ],
    color: '#ffffff',
    component: <View style={{ backgroundColor:'cornflowerblue',borderWidth: 1, height: 52, width:52}}></View>
  },
  {
    id: 'rect1x3',
    name: '1x1 Chair',
    cells: [
      { row: 0, col: 0 },
   
    ],
    color: '#ffffff',
    component: <FontAwesome5 name="chair" size={24}/>
    
  },
];

const createEmptyGrid = (rows, cols) =>
  Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({ occupied: false, color: null, label: '' }))
  );

export default function App() {
  const getSize = () => Math.floor(Math.min(SCREEN_WIDTH, SCREEN_HEIGHT * 0.75));
  const GRID_SIZE = getSize();
  const [name, setName] = useState("");
  const [hidden, setHidden] = useState(false);
  const [started, setStarted] = useState(false);
  const [gridSize, setGridSize] = useState({ rows: 10, cols: 10 });
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [tempRows, setTempRows] = useState('10');
  const [tempCols, setTempCols] = useState('10');
  const [grid, setGrid] = useState(createEmptyGrid(10, 10));
  const [shapes, setShapes] = useState(defaultShapes);
  const [selectedShape, setSelectedShape] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  const [previewPos, setPreviewPos] = useState(null);
  const [tool, setTool] = useState('place'); // 'place' or 'erase'

  const cellSize = GRID_WIDTH / Math.max(gridSize.rows, gridSize.cols);

  const gridRef = useRef(null);
  const gridLayout = useRef({ x: 0, y: 0, width: 0, height: 0 });

  const onGridLayout = (event) => {
    gridLayout.current = event.nativeEvent.layout;
  };

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderMove: (evt) => {
      const { pageX, pageY } = evt.nativeEvent;
      const { x, y } = gridLayout.current;
      const relativeX = pageX - x;
      const relativeY = pageY - y;
      const row = Math.floor(relativeY / cellSize);
      const col = Math.floor(relativeX / cellSize);
      if (
        row >= 0 &&
        col >= 0 &&
        row < gridSize.rows &&
        col < gridSize.cols
      ) {
        setPreviewPos(tool === 'place' ? { row, col } : null);
      } else {
        setPreviewPos(null);
      }
    },
    onPanResponderRelease: () => {
      setPreviewPos(null);
    },
  });
  const rightClick = (startRow, startCol) => {
    if (grid[startRow][startCol].occupied) {
        const newGrid = grid.map(row => row.slice());
        newGrid[startRow][startCol] = { occupied: false, color: null, label: '' };
        setGrid(newGrid);
    }
  }
  const handlePlaceShape = (startRow, startCol) => {
    if (tool === 'erase') {
      if (grid[startRow][startCol].occupied) {
        const newGrid = grid.map(row => row.slice());
        newGrid[startRow][startCol] = { occupied: false, color: null, label: '' };
        setGrid(newGrid);
      }
      return;
    }

    if (!selectedShape) return;

    const canPlace = selectedShape.cells.every(({ row, col }) => {
      const r = startRow + row;
      const c = startCol + col;
      return (
        r >= 0 &&
        c >= 0 &&
        r < gridSize.rows &&
        c < gridSize.cols &&
        !grid[r][c].occupied
      );
    });

    if (!canPlace) return;

    const newGrid = grid.map(row => row.slice());

    selectedShape.cells.forEach(({ row, col }) => {
      const r = startRow + row;
      const c = startCol + col;
      newGrid[r][c] = {
        occupied: true,
        color: selectedShape.color,
        label: selectedShape.name,
        icon: selectedShape.component
      };
    });

    setGrid(newGrid);
    setPreviewPos(null);
  };

  const renderGrid = () => {
    const previewCells = new Set();
    if (tool === 'place' && selectedShape && previewPos) {
      selectedShape.cells.forEach(({ row, col }) => {
        const r = previewPos.row + row;
        const c = previewPos.col + col;
        if (
          r >= 0 &&
          r < gridSize.rows &&
          c >= 0 &&
          c < gridSize.cols &&
          !grid[r][c].occupied
        ) {
          previewCells.add(`${r},${c}`);
        }
      });
    }

    return grid.map((row, rowIndex) => (
      <View style={styles.gridRow} key={`row-${rowIndex}`}>
        {row.map((cell, colIndex) => {
          const isPreview = previewCells.has(`${rowIndex},${colIndex}`);
          return (
            <Pressable
              key={`cell-${rowIndex}-${colIndex}`}
              style={[
                styles.cell,
                {
                  width: cellSize,
                  height: cellSize,
                  backgroundColor: cell.occupied
                    ? cell.color
                    : isPreview
                    ? '#ccc'
                    : '#eee',
                  borderWidth: 1,
                  borderColor: '#000',
                },
              ]}
              onPointerDown={e => {
            e.preventDefault();                
            const btn = e.nativeEvent.button;  
            if (btn === 0) {
              handlePlaceShape(rowIndex, colIndex);
            } else if (btn === 2) {
              rightClick(rowIndex, colIndex);
            }
          }}
            >
              {cell.occupied && !isPreview ? (
                //gang to change icon go to default shape array
                <View>{cell.icon}</View>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    ));
  };

  const applySettings = () => {
    const rows = parseInt(tempRows, 10);
    const cols = parseInt(tempCols, 10);
    if (!isNaN(rows) && !isNaN(cols)) {
      setGridSize({ rows, cols });
      setGrid(createEmptyGrid(rows, cols));
      setSettingsVisible(false);
      setName("");
    }
  };

  const handleAddNewShape = (newShape) => {
    setShapes([...shapes, newShape]);
    setShowEditor(false);
  };
  const loadGrid = async() => {
    try {
      const data = await load()              // returns { name, grid }
      if (data && Array.isArray(data.grid)) {
        setName(data.name || '')
        setGrid(data.grid)
        setGridSize({
          rows: data.grid.length,
          cols: data.grid[0]?.length || 0
        })
      }
    } catch (err) {
      console.error('Load failed:', err)
    }
  }



  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.settingsIcon}
        onPress={() => {
          setTempRows(gridSize.rows.toString());
          setTempCols(gridSize.cols.toString());
          setSettingsVisible(true);
        }}
      >
        <Icon name="settings-outline" size={24} color="black" />
      </TouchableOpacity>

      {!hidden && <Text style={styles.title}>GriDesigner 1.0.0</Text>}

      {!started ? (
        <>
          <TouchableOpacity
            style={styles.button}
            onPress={() => {
              setStarted(true);
              setHidden(true);
            }}
          >
            <Text style={styles.buttonText}>Start</Text>
          </TouchableOpacity>

        </>
      ) : (
        <>
          <TextInput style={{
 

   width: 160,
   height: 40,
   borderWidth: 1,
   borderColor: '#000',
   padding: 10,
   backgroundColor: '#fff',
   margin: 20,
   alignSelf: "flex-start"
 }} placeholder='Untitled Design' value={name} onChangeText={setName} />
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            
            <View
              ref={gridRef}
              onLayout={onGridLayout}
              style={[styles.grid, { width: GRID_WIDTH, height: GRID_WIDTH }]}
              {...(Platform.OS === 'web' ? {} : panResponder.panHandlers)}
              
              onMouseMove={
                Platform.OS === 'web'
                  ? (e) => {
                      const bounds = e.currentTarget.getBoundingClientRect();
                      const x = e.clientX - bounds.left;
                      const y = e.clientY - bounds.top;
                      const row = Math.floor(y / cellSize);
                      const col = Math.floor(x / cellSize);
                      if (
                        row >= 0 &&
                        col >= 0 &&
                        row < gridSize.rows &&
                        col < gridSize.cols
                      ) {
                        setPreviewPos(tool === 'place' ? { row, col } : null);
                      } else {
                        setPreviewPos(null);
                      }
                    }
                  : undefined
              }
              onMouseLeave={Platform.OS === 'web' ? () => setPreviewPos(null) : undefined}
            >
              {renderGrid()}
            </View>
          </View>

          <View style={styles.bottomBar}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 1 }}>
              {shapes.map((shape) => (
                <TouchableOpacity
                  key={shape.id}
                  style={[
                    styles.shapeOption,
                    { backgroundColor: shape.color },
                    tool === 'place' && selectedShape?.id === shape.id ? styles.selectedShape : null,
                  ]}
                  onPress={() => {
                    setSelectedShape(shape);
                    setTool('place');
                  }}
                >
                  <Text style={styles.shapeText}>{shape.name}</Text>
                </TouchableOpacity>
              ))}

              <TouchableOpacity
                key="eraser"
                style={[
                  styles.shapeOption,
                  styles.eraserShape,
                  tool === 'erase' ? styles.selectedShape : null,
                ]}
                onPress={() => {
                  setSelectedShape(null);
                  setTool('erase');
                }}
              >
                <Text style={styles.shapeText}>Eraser</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.addShapeButton}
                onPress={() => {
                  setShowEditor(true);
                  setTool('place');
                }}
              >
                <Text style={styles.addShapeText}>+ Add Shape</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.addShapeButton}
                onPress={() => save(grid, name)}
                >
                  <Text style={styles.shapeText}>Save</Text>
                </TouchableOpacity>
              <TouchableOpacity
                style={styles.addShapeButton}
                onPress={loadGrid}
                >
                  <Text style={styles.shapeText}>Load</Text>
                </TouchableOpacity>
            </ScrollView>
          </View>
        </>
      )}

      <Modal visible={settingsVisible} animationType="slide" transparent={true}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={{ fontSize: 18, marginBottom: 10 }}>Grid Settings</Text>
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              placeholder="Insert number of rows"
              value={tempRows}
              onChangeText={setTempRows}
            />
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              placeholder="Insert number of columns"
              value={tempCols}
              onChangeText={setTempCols}
            />
            <TouchableOpacity style={styles.button} onPress={applySettings}>
              <Text style={styles.buttonText}>Apply</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {showEditor && (
        <ShapeEditorModal onClose={() => setShowEditor(false)} onSave={handleAddNewShape} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 60,
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  button: {
    paddingVertical: 20,
    paddingHorizontal: 30,
    height: 60,
    borderWidth: 5,
    borderColor: '#000',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 10,
  },
  buttonText: {
    fontSize: 28,
    textAlign: 'center',
  },
  buttonlink: {
    paddingVertical: 20,
    paddingHorizontal: 30,
    height: 60,
    borderWidth: 5,
    borderColor: '#000',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 10,
  },
  buttonlinkText: {
    fontSize: 28,
    textAlign: 'center',
  },
  settingsIcon: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#000',
    zIndex: 999,
  },
  grid: {
    marginHorizontal: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridRow: {
    flexDirection: 'row',
  },
  cell: {
    borderWidth: 1,
    borderColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellLabel: {
    fontSize: 10,
    color: '#000',
  },
  bottomBar: {
    width: '100%',
    borderTopWidth: 2,
    borderColor: '#000',
    height: 100,
    backgroundColor: '#ddd',
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  shapeOption: {
    borderWidth: 2,
    borderColor: '#000',
    padding: 10,
    marginRight: 10,
    borderRadius: 6,
  },
  shapeText: {
    color: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  eraserShape: {
    backgroundColor: '#bdc3c7',
    borderColor: '#7f8c8d',
  },
  selectedShape: {
    borderWidth: 3,
    borderColor: '#000',
  },
  addShapeButton: {
    borderWidth: 2,
    borderColor: '#000',
    padding: 10,
    borderRadius: 6,
  },
  addShapeText: {
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#000000aa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: 320,
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#000',
  },
  input: {
    borderWidth: 2,
    borderColor: '#000',
    width: '100%',
    padding: 8,
    marginVertical: 5,
    borderRadius: 5,
  },
});
