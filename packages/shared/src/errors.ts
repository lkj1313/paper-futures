/**
 * 에러 카탈로그. 에러 코드마다 HTTP 상태 코드와 기본 메시지를 정한다.
 * 도메인 에러(인증, 주문 등)는 해당 기능을 만들 때 여기에 추가한다.
 */
export const ERRORS = {
  // 공통
  VALIDATION_ERROR: { status: 400, message: '요청 값이 올바르지 않습니다.' },
  BAD_REQUEST: { status: 400, message: '잘못된 요청입니다.' },
  UNAUTHORIZED: { status: 401, message: '인증이 필요합니다.' },
  FORBIDDEN: { status: 403, message: '권한이 없습니다.' },
  NOT_FOUND: { status: 404, message: '대상을 찾을 수 없습니다.' },
  CONFLICT: { status: 409, message: '이미 존재하는 데이터입니다.' },
  INTERNAL_ERROR: { status: 500, message: '서버 오류가 발생했습니다.' },
  SERVICE_UNAVAILABLE: {
    status: 503,
    message: '서비스를 일시적으로 사용할 수 없습니다.',
  },

  // 인증
  EMAIL_ALREADY_EXISTS: { status: 409, message: '이미 가입된 이메일입니다.' },
  INVALID_CREDENTIALS: {
    status: 401,
    message: '이메일 또는 비밀번호가 올바르지 않습니다.',
  },
  TOKEN_EXPIRED: { status: 401, message: '토큰이 만료되었습니다.' },
  INVALID_REFRESH_TOKEN: {
    status: 401,
    message: '다시 로그인해야 합니다.',
  },

  // 주문
  INVALID_ORDER_QTY: {
    status: 400,
    message: '주문 수량이 올바르지 않습니다.',
  },
  INVALID_ORDER_PRICE: {
    status: 400,
    message: '주문 가격이 올바르지 않습니다.',
  },
  INVALID_LEVERAGE: { status: 400, message: '레버리지가 올바르지 않습니다.' },
  INSUFFICIENT_MARGIN: { status: 400, message: '주문 가능 금액이 부족합니다.' },
  INSUFFICIENT_LIQUIDITY: {
    status: 400,
    message: '호가가 부족해 주문을 모두 체결할 수 없습니다.',
  },
  POSITION_FLIP_NOT_SUPPORTED: {
    status: 400,
    message:
      '포지션보다 큰 반대 주문은 지원하지 않습니다. 포지션을 닫은 뒤 다시 주문하세요.',
  },
  REDUCE_ONLY_REJECTED: {
    status: 400,
    message: '줄일 수 있는 포지션이 없어 reduceOnly 주문을 거부했습니다.',
  },
  ORDER_NOT_OPEN: {
    status: 409,
    message: '대기 중인 주문만 취소할 수 있습니다.',
  },

  // 시세
  MARKET_DATA_UNAVAILABLE: {
    status: 503,
    message: '시세 정보를 아직 받지 못했습니다.',
  },
} as const satisfies Record<string, { status: number; message: string }>;

export type ErrorCode = keyof typeof ERRORS;

export interface ErrorDetail {
  path: string;
  message: string;
}

/** API가 실패했을 때 항상 이 형태로 응답한다. */
export interface ErrorResponse {
  statusCode: number;
  code: ErrorCode;
  message: string;
  details?: ErrorDetail[];
}
