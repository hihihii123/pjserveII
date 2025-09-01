import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  StyleSheet,
  Dimensions,
  ScrollView,
  PanResponder,
  Platform,
  Pressable,
  Alert,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import FontAwesome5 from "react-native-vector-icons/FontAwesome5";
import ShapeEditorModal from "./ShapeEditorModal";
import { save, load } from "./save";
import Slider from "@react-native-community/slider";
import ColorPicker from "./ColorPicker";
import icon from "./assets/official_icon.png";
import tableIcon from "./assets/table_icon.png";


if (Platform.OS === "web") {
  document.addEventListener("contextmenu", (event) => event.preventDefault());
}

//beta rotation
const rotateShape = (shape) => {
  const newCells = shape.cells.map(({ row, col }) => ({ row: col, col: -row }));
  const minRow = Math.min(...newCells.map((c) => c.row));
  const minCol = Math.min(...newCells.map((c) => c.col));
  const normalized = newCells.map(({ row, col }) => ({
    row: row - minRow,
    col: col - minCol,
  }));
  return { ...shape, cells: normalized };
};

const SCREEN_WIDTH = Dimensions.get("window").width;
const SCREEN_HEIGHT = Dimensions.get("window").height;
const GRID_WIDTH = 550;

const createEmptyGrid = (rows, cols) =>
  Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({
      occupied: false,
      color: null,
      label: "",
      comment: null,
    }))
  );

export default function App() {
  const [tableColour, setTableColour] = useState("#6495ED")
const [colourpickervisible, setcolourpickervisible] = useState(false);

const defaultShapes = [
  {
    id: "table1x1",
    name: "Table",
    cells: [{ row: 0, col: 0 }],
    color: tableColour,
   
  },
  {
    id: "chair1x1",
    name: "Chair",
    cells: [{ row: 0, col: 0 }],
    color: "#ffffff",
   
  },
];
  useEffect(() => {
    setShapes((prev) =>
      prev.map((s) =>
        s.id === "table1x1"
          ? {
              ...s,
              color: tableColour,
              component: (
                <View
                  style={{
                    backgroundColor: tableColour,
                    height: "100%",
                    width: "100%",
                  }}
                />
              ),
            }
          : s
      )
    );
  }, [tableColour]);
  const getSize = () =>
    Math.floor(Math.min(SCREEN_WIDTH, SCREEN_HEIGHT * 0.75));
  const GRID_SIZE = getSize();
  const [name, setName] = useState("");
  const [hidden, setHidden] = useState(false);
  const [started, setStarted] = useState(false);
  const [gridSize, setGridSize] = useState({ rows: 10, cols: 10 });
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [tempRows, setTempRows] = useState("10");
  const [tempCols, setTempCols] = useState("10");
  const [grid, setGrid] = useState(createEmptyGrid(10, 10));
  const [shapes, setShapes] = useState(defaultShapes);
  const [selectedShape, setSelectedShape] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  const [previewPos, setPreviewPos] = useState(null);
  const [tool, setTool] = useState(null);
  const [commentModalVisible, setCommentModalVisible] = useState(false);
  const [currentComment, setCurrentComment] = useState("");
  const [selectedCell, setSelectedCell] = useState(null);
  const [highlightedComment, setHighlightedComment] = useState(null);
  const [eraseSize, setEraseSize] = useState(1);
  const [tableColor, setTableColor] = useState(null);

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
      if (row >= 0 && col >= 0 && row < gridSize.rows && col < gridSize.cols) {
        setPreviewPos(tool === "place" ? { row, col } : null);
      } else {
        setPreviewPos(null);
      }
    },
    onPanResponderRelease: () => {
      setPreviewPos(null);
    },
  });

  const handleCellPress = (startRow, startCol) => {
    if (tool === "comment") {
      setSelectedCell({ row: startRow, col: startCol });
      setCurrentComment(grid[startRow][startCol].comment || "");
      setCommentModalVisible(true);
    } else {
      handlePlaceShape(startRow, startCol);
    }
  };

  const rightClick = (startRow, startCol) => {
    if (grid[startRow][startCol].occupied) {
      rowCounter = 0;
      columnCounter = 0;

      const newGrid = grid.map((row) => [...row]);
      while (rowCounter < eraseSize) {
        if (startRow + rowCounter <= gridSize.cols) {
          while (columnCounter < eraseSize) {
            if (startCol + eraseSize <= gridSize.rows) {
              newGrid[startRow + rowCounter][startCol + columnCounter] = {
                occupied: false,
                color: null,
                label: "",
                comment: null,
              };
            }
            columnCounter = columnCounter + 1;
          }
          columnCounter = 0;
        }
        rowCounter = rowCounter + 1;
      }
      setGrid(newGrid);
    }
  };

  const handlePlaceShape = (startRow, startCol) => {
    if (tool === "erase") {
      rightClick(startRow, startCol);
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

    const newGrid = grid.map((row) => [...row]);

    selectedShape.cells.forEach(({ row, col }) => {
      const r = startRow + row;
      const c = startCol + col;
      newGrid[r][c] = {
        occupied: true,
        color: selectedShape.color,
        label: selectedShape.name,
        comment: null,
      };
    });

    setGrid(newGrid);
    setPreviewPos(null);
  };

  const handleSaveComment = () => {
    if (selectedCell) {
      const { row, col } = selectedCell;
      const newGrid = grid.map((gridRow) => [...gridRow]);
      newGrid[row][col].comment = currentComment;
      setGrid(newGrid);
      setCommentModalVisible(false);
      setSelectedCell(null);
      setCurrentComment(null);
    }
  };

  const handleResolveComment = (rowIndex, colIndex) => {
    const newGrid = [...grid];
    newGrid[rowIndex][colIndex].comment = null;
    setGrid(newGrid);
  };

  const getTableBorders = (rowIndex, colIndex, currentGrid) => {
    const isTable = (r, c) => {
      return (
        r >= 0 &&
        r < gridSize.rows &&
        c >= 0 &&
        c < gridSize.cols &&
        currentGrid[r][c].occupied &&
        currentGrid[r][c].label.includes("Table")
      );
    };

    const style = {
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderLeftWidth: 1,
      borderRightWidth: 1,
    };

    if (isTable(rowIndex - 1, colIndex)) style.borderTopWidth = 0;
    if (isTable(rowIndex + 1, colIndex)) style.borderBottomWidth = 0;
    if (isTable(rowIndex, colIndex - 1)) style.borderLeftWidth = 0;
    if (isTable(rowIndex, colIndex + 1)) style.borderRightWidth = 0;

    return style;
  };

  const getCommentsFromGrid = () => {
    const comments = [];
    grid.forEach((row, rowIndex) => {
      row.forEach((cell, colIndex) => {
        if (cell.comment) {
          comments.push({
            id: `${rowIndex}-${colIndex}`,
            name: `Comment at [${rowIndex + 1}, ${colIndex + 1}]`,
            description: cell.comment,
            rowIndex,
            colIndex,
          });
        }
      });
    });
    return comments;
  };

  const commentsOnGrid = getCommentsFromGrid();

  const renderGrid = () => {
    const previewCells = new Set();
    if (tool === "place" && selectedShape && previewPos) {
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
          const isHighlighted =
            highlightedComment?.rowIndex === rowIndex &&
            highlightedComment?.colIndex === colIndex;

          let tableBorderStyle = {};
          if (cell.occupied && cell.label.includes("Table")) {
            tableBorderStyle = getTableBorders(rowIndex, colIndex, grid);
          }

          return (
            <Pressable
              key={`cell-${rowIndex}-${colIndex}`}
              style={[
                styles.cell,
                {
                  width: cellSize,
                  height: cellSize,
                  backgroundColor: cell.occupied ?
                    cell.color
                    : isPreview
                    ? "#ccc"
                    : "#eee",
                  borderColor: "#000",
                },
                tableBorderStyle,
                isHighlighted && styles.commentHighlight,
              ]}
              onPress={() => handleCellPress(rowIndex, colIndex)}
              onLongPress={() => {
                if (cell.comment) Alert.alert("Comment", cell.comment);
              }}
              onPointerDown={(e) => {
                if (Platform.OS === "web") {
                  e.preventDefault();
                  const btn = e.nativeEvent.button;
                  if (btn === 0) handleCellPress(rowIndex, colIndex);
                  else if (btn === 2) rightClick(rowIndex, colIndex);
                } else {
                  handleCellPress(rowIndex, colIndex);
                }
              }}
            >
              {cell.occupied && !isPreview ? (
                <View
                  style={{
                    width: "100%",
                    height: "100%",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  {cell.label === "Chair" ? (
                    <FontAwesome5 name="chair" size={24} />
                  ) : (<View
        style={{
          backgroundColor: cell.color,
          height: "100%",
          width: "100%",
        }}
      ></View>)}
                </View>
              ) : null}
              {cell.comment && (
                <View style={styles.commentIcon}>
                  <FontAwesome5 name="comment-alt" size={12} color="black" />
                </View>
              )}
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

  const loadGrid = async () => {
    try {
      const data = await load();
      if (data && Array.isArray(data.grid)) {
        setName(data.name || "");
        const loadedGrid = data.grid.map((row) =>
          row.map((cell) => ({ ...cell, comment: cell.comment || null }))
        );
        setGrid(loadedGrid);
        setGridSize({
          rows: data.grid.length,
          cols: data.grid[0]?.length || 0,
        });
      }
    } catch (err) {
      console.error("Load failed:", err);
    }
  };

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

      {!hidden && <Text style={styles.title}>GriDesigner</Text>}

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
          <TextInput
            style={styles.nameInput}
            placeholder="Untitled Design"
            value={name}
            onChangeText={setName}
          />
          <View
            style={{
              flex: 1,
              alignItems: "center",
              flexDirection: "row",
              justifyContent: "space-between",
            }}
          >
            {/* 
              TESTING SETTINGS SIDEBAR
              <Text style={styles.nameInput}>Testing</Text>
              */}

            {tool == "place" || tool == "erase" ? (
              <View style={styles.leftSection}>
                {tool == "place" && (
                  <View>
                    <Text style={{ fontWeight: "bold" }}>
                      {selectedShape.name}
                    </Text>
                    {selectedShape.id === "table1x1" ? (
                    <TouchableOpacity
                      style={styles.addShapeButton}
                      onPress={() => {
                        setcolourpickervisible(true);
                      }}
                    >
                      <Text style={{color: tableColour}}>Change Colour</Text>
                    </TouchableOpacity>
                    ) : (<></>)
}
                  </View>
                )}

                {tool == "erase" && (
                  <View>
                    <Text style={{ fontWeight: "bold" }}>Eraser</Text>
                    <Text style={{ margin: 10 }}>
                      Size: {eraseSize} x {eraseSize}
                    </Text>
                    <Slider
                      style={{ width: 170, height: 40 }}
                      minimumValue={1}
                      maximumValue={Math.max(gridSize.rows, gridSize.cols)}
                      minimumTrackTintColor="#858585"
                      maximumTrackTintColor="#000000"
                      value={eraseSize}
                      onValueChange={(value) => setEraseSize(Math.round(value))}
                    />
                  </View>
                )}
              </View>
            ) : (
              <View style={{ width: 200, padding: 10, margin: 20 }}></View>
            )}

            <View
              ref={gridRef}
              onLayout={onGridLayout}
              style={[styles.grid, { width: GRID_WIDTH, height: GRID_WIDTH }]}
              {...(Platform.OS === "web" ? {} : panResponder.panHandlers)}
              onMouseMove={
                Platform.OS === "web"
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
                        setPreviewPos(tool === "place" ? { row, col } : null);
                      } else {
                        setPreviewPos(null);
                      }
                    }
                  : undefined
              }
              onMouseLeave={
                Platform.OS === "web" ? () => setPreviewPos(null) : undefined
              }
            >
              {renderGrid()}
            </View>
            {/*COMMENTS FUNCTION GANG ILY */}
            <View style={styles.commentsSection}>
              <Text style={{ fontSize: 20, fontWeight: "bold" }}>Comments</Text>
              <ScrollView>
                {commentsOnGrid.map((item) => {
                  const isCommentHighlighted =
                    highlightedComment?.rowIndex === item.rowIndex &&
                    highlightedComment?.colIndex === item.colIndex;
                  return (
                    <View
                      key={item.id}
                      style={[
                        styles.commentItem,
                        isCommentHighlighted && styles.highlightedCommentItem,
                      ]}
                    >
                      <TouchableOpacity
                        onPress={() => {
                          isCommentHighlighted
                            ? setHighlightedComment(null)
                            : setHighlightedComment({
                                rowIndex: item.rowIndex,
                                colIndex: item.colIndex,
                              });
                        }}
                      >
                        <Text style={{ fontWeight: "bold" }}>{item.name}</Text>
                        <Text>{item.description}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.resolveButton}
                        onPress={() => handleResolveComment(item.rowIndex, item.colIndex)}
                      >
                        <Text style={styles.resolveButtonText}>Resolve</Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </ScrollView>
            </View>
          </View>
          <View style={styles.bottomBar}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ flexGrow: 1 }}
            >
              {shapes.map((shape) => (
                <TouchableOpacity
                  key={shape.id}
                  style={[
                    styles.shapeOption,
                    {
                      backgroundColor: shape.id.includes("Table")
                        ? shape.color
                        : "#fff",
                    },
                    tool === "place" && selectedShape?.id === shape.id
                      ? styles.selectedShape
                      : null,
                  ]}
                  onPress={() => {
                    setSelectedShape(shape);
                    setTool("place");
                  }}
                >
                  <View style={{ flexDirection: "row" }}>
                    <Text style={styles.shapeText}>{shape.name}</Text>
                    
                  </View>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                key="eraser"
                style={[
                  styles.shapeOption,
                  styles.eraserShape,
                  tool === "erase" ? styles.selectedShape : null,
                ]}
                onPress={() => {
                  setSelectedShape(null);
                  setTool("erase");
                }}
              >
                <Text style={styles.shapeText}>Eraser</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.shapeOption,
                  tool === "comment" ? styles.selectedShape : null,
                ]}
                onPress={() => {
                  setTool("comment");
                  setSelectedShape(null);
                }}
              >
                <Text style={styles.shapeText}>Comment</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.addShapeButton}
                onPress={() => {
                  setShowEditor(true);
                  setTool(null);
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
            <Text style={{ fontSize: 18, marginBottom: 10 }}>
              Grid Settings
            </Text>
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
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-around",
                width: "100%",
                marginTop: 10,
              }}
            >
              <TouchableOpacity style={styles.button} onPress={applySettings}>
                <Text style={styles.buttonText}>Apply</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.button}
                onPress={() => setSettingsVisible(false)}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <Modal visible={colourpickervisible} animationType="slide" transparent={true}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.shapeText}>Input your desired hex code below...</Text>
            <TextInput value={tableColour} onChangeText={text => setTableColour(text)} />
              <Text style={styles.shapeText}>Or use our colour picker!</Text>
        <ColorPicker color={tableColour} onColorChange={setTableColour} />
        <TouchableOpacity style={styles.addShapeButton} onPress={() => {
          setSelectedShape(defaultShapes[0])
          setcolourpickervisible(false)
          }}>
          <Text style={styles.shapeText}>Confirm</Text>
        </TouchableOpacity>
        </View>
        </View>
      </Modal>
      <Modal
        visible={commentModalVisible}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={{ fontSize: 18, marginBottom: 10 }}>
              Add/Edit Comment
            </Text>
            <TextInput
              style={[styles.input, { height: 100 }]}
              multiline
              placeholder="Type your comment here..."
              value={currentComment}
              onChangeText={setCurrentComment}
            />
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-around",
                width: "100%",
              }}
            >
              <TouchableOpacity
                style={styles.button}
                onPress={handleSaveComment}
              >
                <Text style={styles.buttonText}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.button}
                onPress={() => setCommentModalVisible(false)}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
          
      {showEditor && (
        <ShapeEditorModal
          onClose={() => setShowEditor(false)}
          onSave={handleAddNewShape}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingTop: 60,
  },
  title: {
    fontSize: 48,
    fontWeight: "bold",
    textAlign: "center",
  },
  nameInput: {
    width: 160,
    height: 40,
    borderWidth: 1,
    borderColor: "#000",
    padding: 10,
    backgroundColor: "#fff",
    margin: 20,
    alignSelf: "flex-start",
  },
  commentsSection: {
    flexDirection: "column",
    height: 500,
    width: 200,
    // width: 100
    // height: 100,
    borderWidth: 1,
    borderColor: "#000",
    padding: 10,
    backgroundColor: "#fff",
    margin: 20,
  },

  leftSection: {
    flexDirection: "column",
    flexWrap: "wrap",
    width: 200,

    // width: 100
    // height: 100,
    borderWidth: 1,
    borderColor: "#000",
    padding: 10,
    backgroundColor: "#fff",
    margin: 20,
  },

  button: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderWidth: 2,
    borderColor: "#000",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 10,
    marginHorizontal: 5,
  },
  buttonText: {
    fontSize: 18,
    textAlign: "center",
  },
  settingsIcon: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#000",
    zIndex: 999,
  },
  grid: {
    marginHorizontal: 10,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#000",
  },
  gridRow: {
    flexDirection: "row",
  },
  cell: {
    borderWidth: 1,
    borderColor: "#000",
    alignItems: "center",
    justifyContent: "center",
  },
  commentIcon: {
    position: "absolute",
    top: 2,
    right: 2,
    backgroundColor: "rgba(255, 255, 0, 0.8)",
    borderRadius: 6,
    padding: 2,
  },
  bottomBar: {
    width: "100%",
    borderTopWidth: 2,
    borderColor: "#000",
    height: 100,
    backgroundColor: "#ddd",
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  shapeOption: {
    borderWidth: 2,
    borderColor: "#000",
    padding: 10,
    marginRight: 10,
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  shapeText: {
    color: "#000",
  },
  eraserShape: {
    backgroundColor: "#bdc3c7",
    borderColor: "#7f8c8d",
  },
  selectedShape: {
    borderWidth: 3,
    borderColor: "blue",
  },
  addShapeButton: {
    borderWidth: 2,
    borderColor: "#000",
    padding: 10,
    borderRadius: 6,
    marginRight: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  addShapeText: {
    fontWeight: "bold",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#000000aa",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: 350,
    padding: 20,
    backgroundColor: "#fff",
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#000",
  },
  input: {
    borderWidth: 2,
    borderColor: "#000",
    width: "100%",
    padding: 8,
    marginVertical: 5,
    borderRadius: 5,
  },
  commentHighlight: {
    borderColor: "red",
    borderWidth: 3,
  },

  commentItem: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginVertical: 5,
    borderColor: "#ccc",
    width: 150,
  },

  highlightedCommentItem: {
    borderColor: "red",
    borderWidth: 2,
  },
  resolveButton: {
    backgroundColor: "#27ae60",
    padding: 8,
    borderRadius: 5,
    marginTop: 10,
    alignItems: 'center',
  },
  resolveButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
});
