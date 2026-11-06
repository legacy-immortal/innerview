import { Box, HStack, IconButton } from '@chakra-ui/react';
import { ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { HiArrowsExpand, HiChevronLeft, HiChevronRight } from 'react-icons/hi';

interface ResizableSidebarProps {
  children: ReactNode;
  defaultWidth?: number;
  minWidth?: number;
  maxWidth?: number;
  visible?: boolean;
  onVisibilityChange?: (visible: boolean) => void;
  onWidthChange?: (width: number) => void;
  backgroundColor?: string; // CSS color value (hex, rgb, rgba, transparent, etc.)
  hideToggle?: boolean; // Hide toggle buttons (for terminal mode)
  fullWidth?: boolean; // Make sidebar full width (for terminal mode)
}

export const ResizableSidebar = ({
  children,
  defaultWidth = 400,
  minWidth = 200,
  maxWidth,
  visible: controlledVisible,
  onVisibilityChange,
  onWidthChange,
  backgroundColor = 'transparent',
  hideToggle = false,
  fullWidth = false,
}: ResizableSidebarProps) => {
  const [internalVisible, setInternalVisible] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(defaultWidth);
  const [isResizing, setIsResizing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const resizeStartXRef = useRef(0);
  const resizeStartWidthRef = useRef(defaultWidth);

  const isControlled = controlledVisible !== undefined;
  const sidebarVisible = isControlled ? controlledVisible : internalVisible;

  const setSidebarVisible = (newVisible: boolean) => {
    if (!isControlled) {
      setInternalVisible(newVisible);
    }
    onVisibilityChange?.(newVisible);
  };

  const handleWidthChange = useCallback(
    (newWidth: number) => {
      setSidebarWidth(newWidth);
      onWidthChange?.(newWidth);
    },
    [onWidthChange]
  );

  // Resize handler
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - resizeStartXRef.current;
      const newWidth = resizeStartWidthRef.current + deltaX;
      const calculatedMaxWidth = maxWidth ?? window.innerWidth * 0.5;
      const clampedWidth = Math.max(
        minWidth,
        Math.min(calculatedMaxWidth, newWidth)
      );
      handleWidthChange(clampedWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, minWidth, maxWidth, handleWidthChange]);

  // Fullscreen handler
  const handleFullscreen = useCallback(async () => {
    if (!document.documentElement) return;

    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (error) {
      console.error('Error toggling fullscreen:', error);
    }
  }, []);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  return (
    <Box position="relative">
      <Box
        ref={sidebarRef}
        w={fullWidth ? '100%' : sidebarVisible ? `${sidebarWidth}px` : '0px'}
        flexShrink={0}
        h="100%"
        display="flex"
        flexDirection="column"
        borderRight={sidebarVisible && !fullWidth ? '1px solid' : 'none'}
        borderColor="rgba(255, 255, 255, 0.08)"
        bg={backgroundColor}
        overflow="hidden"
        transition={isResizing ? 'none' : 'width 0.3s ease-in-out'}
        maxW="100%"
        minW={0}
        position="relative"
        css={{
          '& *': {
            maxWidth: '100%',
            minWidth: 0,
          },
        }}
      >
        {/* Floating Toggle Button - Top right of drawer, outside */}
        {sidebarVisible && !hideToggle && (
          <IconButton
            aria-label="Toggle sidebar"
            position="absolute"
            top="8px"
            right="-40px"
            zIndex={20}
            size="sm"
            variant="ghost"
            colorPalette="gray"
            onClick={() => setSidebarVisible(false)}
          >
            <HiChevronLeft />
          </IconButton>
        )}
        {/* Resize Handle */}
        {sidebarVisible && !fullWidth && (
          <Box
            position="absolute"
            right={0}
            top={0}
            bottom={0}
            width="4px"
            cursor="col-resize"
            zIndex={15}
            bg="transparent"
            _hover={{
              bg: 'rgba(255, 255, 255, 0.1)',
            }}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              resizeStartXRef.current = e.clientX;
              resizeStartWidthRef.current = sidebarWidth;
              setIsResizing(true);
            }}
            css={{
              userSelect: 'none',
              touchAction: 'none',
            }}
          />
        )}
        {sidebarVisible && (
          <>
            {/* Header with action buttons */}
            {!hideToggle && (
              <HStack
                p={2}
                justify="flex-end"
                gap={2}
                borderBottom="1px solid"
                borderColor="rgba(255, 255, 255, 0.08)"
              >
                <IconButton
                  aria-label="Hide sidebar"
                  size="sm"
                  variant="ghost"
                  colorPalette="gray"
                  onClick={() => setSidebarVisible(false)}
                >
                  <HiChevronLeft />
                </IconButton>
                <IconButton
                  aria-label={
                    isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'
                  }
                  size="sm"
                  variant="ghost"
                  colorPalette="gray"
                  onClick={handleFullscreen}
                  transform={isFullscreen ? 'rotate(180deg)' : 'none'}
                  transition="transform 0.2s"
                >
                  <HiArrowsExpand />
                </IconButton>
              </HStack>
            )}
            {children}
          </>
        )}
      </Box>
      {/* Floating Toggle Button - When sidebar is hidden */}
      {!sidebarVisible && !hideToggle && (
        <IconButton
          aria-label="Toggle sidebar"
          position="absolute"
          top="8px"
          left="8px"
          zIndex={20}
          size="sm"
          variant="ghost"
          colorPalette="gray"
          onClick={() => setSidebarVisible(true)}
        >
          <HiChevronRight />
        </IconButton>
      )}
    </Box>
  );
};
