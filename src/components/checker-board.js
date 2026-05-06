import React from "react";
import { Animated, Pressable, View } from "react-native";
import { styles, SURFACE } from "../../styles";
import { useGame } from "../context/GameContext";
import { AppText } from "./app-text";

export function CheckerBoard() {
  const {
    board,
    boardSize,
    captureSources,
    currentTheme,
    forcedPiece,
    handleCellPress,
    isBoardFlipped,
    legalMoves,
    playerThemes,
    selected,
    targetOpacity,
    targetScale,
    tileSize,
  } = useGame();

  return (
    <View style={styles.boardShell}>
      <View style={styles.boardFrame}>
        <View style={[styles.board, { width: boardSize, height: boardSize }]}>
          {board.map((rowCells, displayRow) =>
            rowCells.map((_, displayCol) => {
              const row = isBoardFlipped ? 7 - displayRow : displayRow;
              const col = isBoardFlipped ? 7 - displayCol : displayCol;
              const piece = board[row][col];
              const key = `${row}:${col}`;
              const squareIsDark = (row + col) % 2 === 1;
              const isSelected = selected?.row === row && selected?.col === col;
              const isMoveTarget = legalMoves.some(
                (move) => move.to.row === row && move.to.col === col
              );
              const isCaptureSource = captureSources.has(key);
              const isForcedPiece =
                forcedPiece?.row === row && forcedPiece?.col === col;
              const pieceTheme = piece ? playerThemes[piece.player] : null;

              return (
                <Pressable
                  key={key}
                  onPress={() => handleCellPress(row, col)}
                  style={[
                    styles.tile,
                    {
                      width: tileSize,
                      height: tileSize,
                      backgroundColor: squareIsDark
                        ? SURFACE.tileDark
                        : SURFACE.tileLight,
                    },
                  ]}
                >
                  <View style={styles.tileTint} />
                  {isCaptureSource && !isSelected ? (
                    <View
                      style={[
                        styles.captureSourceHalo,
                        { borderColor: currentTheme.accent },
                      ]}
                    />
                  ) : null}
                  {isSelected ? (
                    <View
                      style={[
                        styles.selectionHalo,
                        {
                          borderColor: currentTheme.accent,
                          backgroundColor: currentTheme.wash,
                        },
                      ]}
                    />
                  ) : null}
                  {isForcedPiece ? <View style={styles.forcedHalo} /> : null}
                  {isMoveTarget ? (
                    <Animated.View
                      style={[
                        styles.moveTarget,
                        {
                          borderColor: currentTheme.accent,
                          opacity: targetOpacity,
                          transform: [{ scale: targetScale }],
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.moveTargetCore,
                          { backgroundColor: currentTheme.accent },
                        ]}
                      />
                    </Animated.View>
                  ) : null}
                  {piece ? (
                    <View
                      style={[
                        styles.piece,
                        {
                          width: tileSize * 0.74,
                          height: tileSize * 0.74,
                          borderRadius: tileSize * 0.37,
                          backgroundColor: pieceTheme.piece,
                          borderColor: pieceTheme.pieceEdge,
                          shadowColor: pieceTheme.accent,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.pieceSheen,
                          { backgroundColor: pieceTheme.pieceEdge },
                        ]}
                      />
                      <View
                        style={[
                          styles.pieceCore,
                          {
                            width: tileSize * 0.28,
                            height: tileSize * 0.28,
                            borderRadius: tileSize * 0.14,
                            backgroundColor: pieceTheme.pieceCore,
                          },
                        ]}
                      />
                      {piece.king ? (
                        <View
                          style={[
                            styles.kingBadge,
                            { borderColor: pieceTheme.pieceEdge },
                          ]}
                        >
                          <AppText style={styles.kingText}>K</AppText>
                        </View>
                      ) : null}
                    </View>
                  ) : null}
                </Pressable>
              );
            })
          )}
        </View>
      </View>
    </View>
  );
}
